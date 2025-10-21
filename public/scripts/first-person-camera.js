(async () => {
  const pc = await import("playcanvas");
  const { createScript, math, Vec2, Vec3, Mat4 } = pc;

  const LOOK_MAX_ANGLE = 90;

  const tmpV1 = new Vec3();
  const tmpV2 = new Vec3();
  const tmpM1 = new Mat4();

  /**
   * Utility function for both touch and gamepad handling of deadzones. Takes a 2-axis joystick
   * position in the range -1 to 1 and applies an upper and lower radial deadzone, remapping values in
   * the legal range from 0 to 1.
   *
   * @param {Vec2} pos - The joystick position.
   * @param {Vec2} remappedPos - The remapped joystick position.
   * @param {number} deadZoneLow - The lower dead zone.
   * @param {number} deadZoneHigh - The upper dead zone.
   */
  function applyRadialDeadZone(pos, remappedPos, deadZoneLow, deadZoneHigh) {
    const magnitude = pos.length();

    if (magnitude > deadZoneLow) {
      const legalRange = 1 - deadZoneHigh - deadZoneLow;
      const normalizedMag = Math.min(1, (magnitude - deadZoneLow) / legalRange);
      remappedPos.copy(pos).scale(normalizedMag / magnitude);
    } else {
      remappedPos.set(0, 0);
    }
  }

  class DesktopInput {
    /**
     * @type {HTMLCanvasElement}
     * @private
     */
    _canvas;

    /**
     * @type {boolean}
     * @private
     */
    _enabled = true;

    /**
     * @type {AppBase}
     */
    app;

    /**
     * @param {AppBase} app - The application.
     */
    constructor(app) {
      this.app = app;
      this._canvas = app.graphicsDevice.canvas;

      this._onKeyDown = this._onKeyDown.bind(this);
      this._onKeyUp = this._onKeyUp.bind(this);
      this._onMouseDown = this._onMouseDown.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);

      this.enabled = true;
    }

    set enabled(val) {
      this._enabled = val;

      if (val) {
        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
        window.addEventListener("mousedown", this._onMouseDown);
        window.addEventListener("mousemove", this._onMouseMove);
      } else {
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);
        window.removeEventListener("mousedown", this._onMouseDown);
        window.removeEventListener("mousemove", this._onMouseMove);
      }
    }

    get enabled() {
      return this._enabled;
    }

    /**
     * @param {string} key - The key pressed.
     * @param {number} val - The key value.
     * @private
     */
    _handleKey(key, val) {
      switch (key.toLowerCase()) {
        case "w":
        case "arrowup":
          this.app.fire("cc:move:forward", val);
          break;
        case "s":
        case "arrowdown":
          this.app.fire("cc:move:backward", val);
          break;
        case "a":
        case "arrowleft":
          this.app.fire("cc:move:left", val);
          break;
        case "d":
        case "arrowright":
          this.app.fire("cc:move:right", val);
          break;
        case " ":
          this.app.fire("cc:jump", !!val);
          break;
        case "shift":
          this.app.fire("cc:sprint", !!val);
          break;
      }
    }

    /**
     * @param {KeyboardEvent} e - The keyboard event.
     * @private
     */
    _onKeyDown(e) {
      if (document.pointerLockElement !== this._canvas) {
        return;
      }

      if (e.repeat) {
        return;
      }
      this._handleKey(e.key, 1);
    }

    /**
     * @param {KeyboardEvent} e - The keyboard event.
     * @private
     */
    _onKeyUp(e) {
      if (e.repeat) {
        return;
      }
      this._handleKey(e.key, 0);
    }

    _onMouseDown(e) {
      if (document.pointerLockElement !== this._canvas) {
        this._canvas.requestPointerLock();
      }
    }

    /**
     * @param {MouseEvent} e - The mouse event.
     * @private
     */
    _onMouseMove(e) {
      if (document.pointerLockElement !== this._canvas) {
        return;
      }

      const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
      const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

      this.app.fire("cc:look", movementX, movementY);
    }

    destroy() {
      this.enabled = false;
    }
  }
  class CharacterController {
    /**
     * @type {Entity}
     * @private
     */
    _camera;

    /**
     * @type {RigidBodyComponent}
     * @private
     */
    _rigidbody;

    /**
     * @type {boolean}
     * @private
     */
    _jumping = false;

    /**
     * @type {AppBase}
     */
    app;

    /**
     * @type {Entity}
     */
    entity;

    /**
     * @type {Vec2}
     */
    look = new Vec2();

    /**
     * @type {Record<string, boolean | number>}
     */
    controls = {
      forward: 0,
      backward: 0,
      left: 0,
      right: 0,
      jump: false,
      sprint: false,
    };

    /**
     * @type {number}
     */
    lookSens = 0.08;

    /**
     * @type {number}
     */
    speedGround = 50;

    /**
     * @type {number}
     */
    speedAir = 5;

    /**
     * @type {number}
     */
    sprintMult = 1.5;

    /**
     * @type {number}
     */
    velocityDampingGround = 0.99;

    /**
     * @type {number}
     */
    velocityDampingAir = 0.99925;

    /**
     * @type {number}
     */
    jumpForce = 600;

    /**
     * @param {AppBase} app - The application.
     * @param {Entity} camera - The camera entity.
     * @param {Entity} entity - The controller entity.
     */
    constructor(app, camera, entity) {
      this.app = app;
      this.entity = entity;

      if (!camera) {
        throw new Error("No camera entity found");
      }
      this._camera = camera;
      if (!entity.rigidbody) {
        throw new Error("No rigidbody component found");
      }
      this._rigidbody = entity.rigidbody;

      this.app.on("cc:look", (movX, movY) => {
        this.look.x = math.clamp(
          this.look.x - movY * this.lookSens,
          -LOOK_MAX_ANGLE,
          LOOK_MAX_ANGLE
        );
        this.look.y -= movX * this.lookSens;
      });
      this.app.on("cc:move:forward", (val) => {
        this.controls.forward = val;
      });
      this.app.on("cc:move:backward", (val) => {
        this.controls.backward = val;
      });
      this.app.on("cc:move:left", (val) => {
        this.controls.left = val;
      });
      this.app.on("cc:move:right", (val) => {
        this.controls.right = val;
      });
      this.app.on("cc:jump", (state) => {
        this.controls.jump = state;
      });
      this.app.on("cc:sprint", (state) => {
        this.controls.sprint = state;
      });
    }

    /**
     * @private
     */
    _checkIfGrounded() {
      const start = this.entity.getPosition();
      const end = tmpV1.copy(start).add(Vec3.DOWN);
      end.y -= 0.1;
      this._grounded = !!this._rigidbody.system.raycastFirst(start, end);
    }

    /**
     * @private
     */
    _jump() {
      if (this._rigidbody.linearVelocity.y < 0) {
        this._jumping = false;
      }
      if (this.controls.jump && !this._jumping && this._grounded) {
        this._jumping = true;
        this._rigidbody.applyImpulse(0, this.jumpForce, 0);
      }
    }

    /**
     * @private
     */
    _look() {
      this._camera.setLocalEulerAngles(this.look.x, this.look.y, 0);
    }

    /**
     * @param {number} dt - The delta time.
     */
    _move(dt) {
      tmpM1.setFromAxisAngle(Vec3.UP, this.look.y);
      const dir = tmpV1.set(0, 0, 0);
      if (this.controls.forward) {
        dir.add(tmpV2.set(0, 0, -this.controls.forward));
      }
      if (this.controls.backward) {
        dir.add(tmpV2.set(0, 0, this.controls.backward));
      }
      if (this.controls.left) {
        dir.add(tmpV2.set(-this.controls.left, 0, 0));
      }
      if (this.controls.right) {
        dir.add(tmpV2.set(this.controls.right, 0, 0));
      }
      tmpM1.transformVector(dir, dir);

      let speed = this._grounded ? this.speedGround : this.speedAir;
      if (this.controls.sprint) {
        speed *= this.sprintMult;
      }

      const accel = dir.mulScalar(speed * dt);
      const velocity = this._rigidbody.linearVelocity.add(accel);

      const damping = this._grounded
        ? this.velocityDampingGround
        : this.velocityDampingAir;
      const mult = Math.pow(damping, dt * 1e3);
      velocity.x *= mult;
      velocity.z *= mult;

      this._rigidbody.linearVelocity = velocity;
    }

    /**
     * @param {number} dt - The delta time.
     */
    update(dt) {
      this._checkIfGrounded();
      this._jump();
      this._look();
      this._move(dt);
    }
  }

  // SCRIPTS

  const DesktopInputScript = createScript("desktopInput");

  DesktopInputScript.prototype.initialize = function () {
    this.input = new DesktopInput(this.app);
    this.on("enable", () => (this.input.enabled = true));
    this.on("disable", () => (this.input.enabled = false));
    this.on("destroy", () => this.input.destroy());
  };

  DesktopInputScript.prototype.swap = function (old) {
    // Preserve the existing input instance and its state
    this.input = old.input;
  };

  const CharacterControllerScript = createScript("characterController");

  CharacterControllerScript.attributes.add("camera", { type: "entity" });
  CharacterControllerScript.attributes.add("lookSens", {
    type: "number",
    default: 0.08,
  });
  CharacterControllerScript.attributes.add("speedGround", {
    type: "number",
    default: 50,
  });
  CharacterControllerScript.attributes.add("speedAir", {
    type: "number",
    default: 5,
  });
  CharacterControllerScript.attributes.add("sprintMult", {
    type: "number",
    default: 1.5,
  });
  CharacterControllerScript.attributes.add("velocityDampingGround", {
    type: "number",
    default: 0.99,
  });
  CharacterControllerScript.attributes.add("velocityDampingAir", {
    type: "number",
    default: 0.99925,
  });
  CharacterControllerScript.attributes.add("jumpForce", {
    type: "number",
    default: 600,
  });

  CharacterControllerScript.prototype.initialize = function () {
    this.controller = new CharacterController(
      this.app,
      this.camera,
      this.entity
    );
    this.controller.lookSens = this.lookSens;
    this.controller.speedGround = this.speedGround;
    this.controller.speedAir = this.speedAir;
    this.controller.sprintMult = this.sprintMult;
    this.controller.velocityDampingGround = this.velocityDampingGround;
    this.controller.velocityDampingAir = this.velocityDampingAir;
    this.controller.jumpForce = this.jumpForce;
  };

  CharacterControllerScript.prototype.swap = function (old) {
    // Transfer any state you want to preserve from the old script instance
    // Here we keep the same controller instance and its current state
    this.controller = old.controller;

    // Also copy any other properties that were set on the old instance if needed
    this.lookSens = old.lookSens;
    this.speedGround = old.speedGround;
    this.speedAir = old.speedAir;
    this.sprintMult = old.sprintMult;
    this.velocityDampingGround = old.velocityDampingGround;
    this.velocityDampingAir = old.velocityDampingAir;
    this.jumpForce = old.jumpForce;
  };

  CharacterControllerScript.prototype.update = function (dt) {
    this.controller.update(dt);
    // console.log("Velocity:", this.entity.rigidbody.linearVelocity);
    // console.log("Position:", this.entity.getPosition());
  };
})();
