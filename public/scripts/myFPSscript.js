export function FpsPlaycanvas(pc, canvasRef) {
  const CharacterController = pc.createScript("characterController");

  // --- Attributes ---
  CharacterController.attributes.add("camera", {
    type: "entity",
    title: "Camera Entity",
  });

  CharacterController.attributes.add("speed", {
    type: "number",
    default: 8,
    title: "Movement Speed",
  });

  CharacterController.attributes.add("fastSpeed", {
    type: "number",
    default: 20,
    title: "Fast Movement Speed",
  });

  CharacterController.attributes.add("sensitivity", {
    type: "number",
    default: 0.3,
    title: "Look Sensitivity",
  });

  CharacterController.attributes.add("lookSpeed", {
    type: "number",
    default: 0.4,
    title: "Drag Look Speed",
  });

  // --- Init ---
  CharacterController.prototype.initialize = function () {
    this.pitch = new pc.Quat();
    this.yaw = new pc.Quat();
    this.velocity = new pc.Vec3();
    this.targetVelocity = new pc.Vec3();
    this.look = new pc.Vec2(0, 0);
    // Inside initialize()
    this.allowPitch = true; // allow vertical look (pitch) by default

    // Drag camera states
    this.isMouseDown = false;
    this.lastX = 0;
    this.lastY = 0;
    this.eulers = new pc.Vec3();

    // Track keyboard movement (for drag-vs-look behavior)
    this.isMoving = false;

    // Store camera reference
    this.cameraEntity = this.camera || this.entity.findByName("camera");

    // Initial rotation
    const angles = this.entity.getLocalEulerAngles();
    this.eulers.x = angles.x;
    this.eulers.y = angles.y;

    // Bind methods
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);

    // Add listeners
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseleave", this.onMouseLeave);
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);

    // Rigidbody setup
    if (!this.entity.rigidbody) {
      console.warn("CharacterController needs a rigidbody component");
      return;
    }
    const rigidbody = this.entity.rigidbody;
    rigidbody.linearDamping = 0.9;
    rigidbody.angularDamping = 0.9;
    rigidbody.linearFactor = new pc.Vec3(1, 1, 1);
    rigidbody.angularFactor = new pc.Vec3(0, 0, 0);

    // --- NEW: joystick state (left stick) ---
    // Axes in camera space: x = left/right, y = forward/back
    this.joyX = 0;
    this.joyY = 0;
  };

  // --- NEW: joystick API the React left-stick will call ---
  CharacterController.prototype.setMoveInput = function (x, y) {
    // Clamp to [-1,1]
    this.joyX = pc.math.clamp(x, -1, 1);
    this.joyY = -pc.math.clamp(y, -1, 1);
  };

  CharacterController.prototype.clearMoveInput = function () {
    this.joyX = 0;
    this.joyY = 0;
  };

  CharacterController.prototype.onMouseLeave = function () {
    if (this.isMouseDown) {
      // stop drag mode, keep cursor consistent
    }
    document.body.style.cursor = "grab";
  };

  CharacterController.prototype.onMouseMove = function (e) {
    if (this.isMouseDown) {
      const dx = e.x - this.lastX;
      const dy = e.y - this.lastY;

      this.lastX = e.x;
      this.lastY = e.y;

      // Only update pitch if allowed
      if (this.allowPitch) {
        this.eulers.x -= dy * this.lookSpeed * 0.5; // vertical
      }
      this.eulers.y -= dx * this.lookSpeed * 0.5; // horizontal

      this.eulers.x = pc.math.clamp(this.eulers.x, 0, 89);

      if (this.cameraEntity) {
        this.pitch.setFromEulerAngles(this.eulers.x, this.eulers.y, 0);
        this.cameraEntity.setLocalRotation(this.pitch);
      }
    }
  };

  CharacterController.prototype.update = function (dt) {
    if (!this.entity.rigidbody) return;

    // Track keyboard pressed state
    this.isMoving =
      this.app.keyboard.isPressed(pc.KEY_W) ||
      this.app.keyboard.isPressed(pc.KEY_A) ||
      this.app.keyboard.isPressed(pc.KEY_S) ||
      this.app.keyboard.isPressed(pc.KEY_D) ||
      this.app.keyboard.isPressed(pc.KEY_UP) ||
      this.app.keyboard.isPressed(pc.KEY_DOWN) ||
      this.app.keyboard.isPressed(pc.KEY_LEFT) ||
      this.app.keyboard.isPressed(pc.KEY_RIGHT);

    const rigidbody = this.entity.rigidbody;

    // Camera-space basis (flattened)
    const cameraForward = this.cameraEntity.forward.clone();
    const cameraRight = this.cameraEntity.right.clone();
    cameraForward.y = 0;
    cameraRight.y = 0;
    cameraForward.normalize();
    cameraRight.normalize();

    // Keyboard axes
    let kx = 0,
      ky = 0;
    if (
      this.app.keyboard.isPressed(pc.KEY_A) ||
      this.app.keyboard.isPressed(pc.KEY_LEFT)
    )
      kx -= 1;
    if (
      this.app.keyboard.isPressed(pc.KEY_D) ||
      this.app.keyboard.isPressed(pc.KEY_RIGHT)
    )
      kx += 1;
    if (
      this.app.keyboard.isPressed(pc.KEY_W) ||
      this.app.keyboard.isPressed(pc.KEY_UP)
    )
      ky += 1;
    if (
      this.app.keyboard.isPressed(pc.KEY_S) ||
      this.app.keyboard.isPressed(pc.KEY_DOWN)
    )
      ky -= 1;

    // Combine keyboard + joystick
    const ax = pc.math.clamp(kx + this.joyX, -1, 1);
    const ay = pc.math.clamp(ky + this.joyY, -1, 1);

    // --- FIX: flip both contributions so W = forward and A = left ---
    const movement = new pc.Vec3();
    if (ax !== 0 || ay !== 0) {
      const f = cameraForward.clone().scale(ay); // flip forward/back
      const r = cameraRight.clone().scale(ax); // flip left/right
      movement.add(f).add(r).normalize();
    }

    const speed = this.app.keyboard.isPressed(pc.KEY_SHIFT)
      ? this.fastSpeed
      : this.speed;
    if (movement.lengthSq() > 0) movement.scale(speed);

    const currentVelocity = rigidbody.linearVelocity;
    const lerpFactor = Math.min(dt * 12, 1);

    this.targetVelocity.set(movement.x, currentVelocity.y, movement.z);
    this.velocity.lerp(currentVelocity, this.targetVelocity, lerpFactor);
    rigidbody.linearVelocity = this.velocity;
  };

  //CharacterController.prototype.update = function (dt) {
  //  if (!this.entity.rigidbody) return;

  //  // Track if keyboard is pressed (WASD/arrows)
  //  this.isMoving =
  //    this.app.keyboard.isPressed(pc.KEY_W) ||
  //    this.app.keyboard.isPressed(pc.KEY_A) ||
  //    this.app.keyboard.isPressed(pc.KEY_S) ||
  //    this.app.keyboard.isPressed(pc.KEY_D) ||
  //    this.app.keyboard.isPressed(pc.KEY_UP) ||
  //    this.app.keyboard.isPressed(pc.KEY_DOWN) ||
  //    this.app.keyboard.isPressed(pc.KEY_LEFT) ||
  //    this.app.keyboard.isPressed(pc.KEY_RIGHT);

  //  const rigidbody = this.entity.rigidbody;

  //  // Camera-space basis (flattened)
  //  const cameraForward = this.cameraEntity.forward.clone();
  //  const cameraRight = this.cameraEntity.right.clone();
  //  cameraForward.y = 0;
  //  cameraRight.y = 0;
  //  cameraForward.normalize();
  //  cameraRight.normalize();

  //  // --- Axes from keyboard ---
  //  let kx = 0,
  //    ky = 0;
  //  if (
  //    this.app.keyboard.isPressed(pc.KEY_A) ||
  //    this.app.keyboard.isPressed(pc.KEY_LEFT)
  //  )
  //    kx -= 1;
  //  if (
  //    this.app.keyboard.isPressed(pc.KEY_D) ||
  //    this.app.keyboard.isPressed(pc.KEY_RIGHT)
  //  )
  //    kx += 1;
  //  if (
  //    this.app.keyboard.isPressed(pc.KEY_W) ||
  //    this.app.keyboard.isPressed(pc.KEY_UP)
  //  )
  //    ky += 1;
  //  if (
  //    this.app.keyboard.isPressed(pc.KEY_S) ||
  //    this.app.keyboard.isPressed(pc.KEY_DOWN)
  //  )
  //    ky -= 1;

  //  // --- Combine keyboard + joystick (left stick) ---
  //  const ax = pc.math.clamp(kx + this.joyX, -1, 1);
  //  const ay = pc.math.clamp(ky + this.joyY, -1, 1);

  //  // Build movement vector in world space from camera basis
  //  const movement = new pc.Vec3();
  //  if (ax !== 0 || ay !== 0) {
  //    const f = cameraForward.clone().scale(ay);
  //    const r = cameraRight.clone().scale(ax);
  //    movement.add(f).add(r).normalize();
  //  }

  //  const speed = this.app.keyboard.isPressed(pc.KEY_SHIFT)
  //    ? this.fastSpeed
  //    : this.speed;

  //  if (movement.lengthSq() > 0) movement.scale(speed);

  //  const currentVelocity = rigidbody.linearVelocity;
  //  const lerpFactor = Math.min(dt * 12, 1);

  //  // Preserve Y (gravity), blend XZ
  //  this.targetVelocity.set(movement.x, currentVelocity.y, movement.z);
  //  this.velocity.lerp(currentVelocity, this.targetVelocity, lerpFactor);

  //  rigidbody.linearVelocity = this.velocity;
  //};

  // Mouse up
  CharacterController.prototype.onMouseUp = function (event) {
    if (event.element && event.element.classList?.contains("overlay-element"))
      return;
    if (event.button === pc.MOUSEBUTTON_LEFT) {
      this.isMouseDown = false;
      document.body.style.cursor = "grab";
    }
  };

  // Mouse down
  CharacterController.prototype.onMouseDown = function (event) {
    if (event.element && event.element.classList?.contains("overlay-element"))
      return;
    if (event.button === pc.MOUSEBUTTON_LEFT) {
      this.isMouseDown = true;
      this.lastX = event.x;
      this.lastY = event.y;
      document.body.style.cursor = "grabbing";
    }
  };

  CharacterController.prototype.destroy = function () {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseleave", this.onMouseLeave);
    this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
  };
}

//export function FpsPlaycanvas(pc, canvasRef) {
//  const CharacterController = pc.createScript("characterController");

//  CharacterController.attributes.add("camera", {
//    type: "entity",
//    title: "Camera Entity",
//  });

//  CharacterController.attributes.add("speed", {
//    type: "number",
//    default: 8,
//    title: "Movement Speed",
//  });

//  CharacterController.attributes.add("fastSpeed", {
//    type: "number",
//    default: 20,
//    title: "Fast Movement Speed",
//  });

//  CharacterController.attributes.add("sensitivity", {
//    type: "number",
//    default: 0.3,
//    title: "Look Sensitivity",
//  });

//  CharacterController.attributes.add("lookSpeed", {
//    type: "number",
//    default: 0.2,
//    title: "Drag Look Speed",
//  });

//  CharacterController.prototype.initialize = function () {
//    this.pitch = new pc.Quat();
//    this.yaw = new pc.Quat();
//    this.velocity = new pc.Vec3();
//    this.look = new pc.Vec2(0, 0);
//    this.targetVelocity = new pc.Vec3();

//    // Drag camera states
//    this.isMouseDown = false;
//    this.lastX = 0;
//    this.lastY = 0;
//    this.eulers = new pc.Vec3();

//    // Mode tracking
//    this.isDragMode = false;

//    // Store camera reference
//    this.cameraEntity = this.camera || this.entity.findByName("camera");

//    // Get initial rotation
//    var angles = this.entity.getLocalEulerAngles();
//    this.eulers.x = angles.x;
//    this.eulers.y = angles.y;

//    // Bind methods
//    this.onMouseMove = this.onMouseMove.bind(this);
//    this.onMouseDown = this.onMouseDown.bind(this);
//    this.onMouseUp = this.onMouseUp.bind(this);
//    this.onMouseLeave = this.onMouseLeave.bind(this);

//    // Add event listeners
//    document.addEventListener("mousemove", this.onMouseMove);
//    document.addEventListener("mouseleave", this.onMouseLeave);
//    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
//    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);

//    if (!this.entity.rigidbody) {
//      console.warn("CharacterController needs a rigidbody component");
//      return;
//    }

//    const rigidbody = this.entity.rigidbody;
//    rigidbody.linearDamping = 0.9;
//    rigidbody.angularDamping = 0.9;
//    rigidbody.linearFactor = new pc.Vec3(1, 1, 1);
//    rigidbody.angularFactor = new pc.Vec3(0, 0, 0);
//  };

//  // CharacterController.prototype.onMouseDown = function (event) {
//  //   if (event.button === pc.MOUSEBUTTON_LEFT) {
//  //     this.isDragMode = true;
//  //     this.isMouseDown = true;
//  //     this.lastX = event.x;
//  //     this.lastY = event.y;
//  //     document.body.style.cursor = "grab";
//  //   }
//  // };

//  CharacterController.prototype.onMouseLeave = function () {
//    // Instead of stopping drag, we'll keep tracking if mouse button is still down
//    if (this.isMouseDown) {
//      this.isDragMode = false;
//    }
//    document.body.style.cursor = "grab";
//  };

//  CharacterController.prototype.onMouseMove = function (e) {
//    // Only allow mouse dragging if we are not actively moving the character with the keyboard
//    if (this.isMouseDown) {
//      const dx = e.x - this.lastX; // Mouse movement in the X-direction (horizontal)
//      const dy = e.y - this.lastY; // Mouse movement in the Y-direction (vertical)

//      this.lastX = e.x;
//      this.lastY = e.y;

//      // Update both x (pitch) and y (yaw) euler angles based on mouse movement
//      this.eulers.x -= dy * this.lookSpeed * 0.5; // Vertical rotation
//      this.eulers.y -= dx * this.lookSpeed * 0.5; // Horizontal rotation

//      // Clamp vertical rotation (pitch) to prevent flipping the camera upside down
//      this.eulers.x = pc.math.clamp(this.eulers.x, 0, 89);
//      // this.eulers.y = pc.math.clamp(this.eulers.y, -89, 89);

//      // Create quaternions for pitch and yaw rotation
//      this.pitch.setFromEulerAngles(this.eulers.x, this.eulers.y, 0); // Vertical rotation (pitch)
//      // this.yaw.setFromEulerAngles(this.eulers.x, this.eulers.y, 0); // Horizontal rotation (yaw)

//      // Apply yaw (horizontal rotation) to the character (entity)
//      // this.entity.setRotation(this.yaw);

//      // Apply pitch (vertical rotation) to the camera
//      if (this.cameraEntity) {
//        this.cameraEntity.setLocalRotation(this.pitch);
//      }
//    }
//  };

//  CharacterController.prototype.update = function (dt) {
//    if (!this.entity.rigidbody) return;

//    // Track if the character is moving using keyboard keys
//    this.isMoving =
//      this.app.keyboard.isPressed(pc.KEY_W) ||
//      this.app.keyboard.isPressed(pc.KEY_A) ||
//      this.app.keyboard.isPressed(pc.KEY_S) ||
//      this.app.keyboard.isPressed(pc.KEY_D) ||
//      this.app.keyboard.isPressed(pc.KEY_UP) ||
//      this.app.keyboard.isPressed(pc.KEY_DOWN) ||
//      this.app.keyboard.isPressed(pc.KEY_LEFT) ||
//      this.app.keyboard.isPressed(pc.KEY_RIGHT);

//    const rigidbody = this.entity.rigidbody;
//    const cameraForward = this.cameraEntity.forward.clone();
//    const cameraRight = this.cameraEntity.right.clone();

//    // Make sure to ignore the vertical component of camera movement (no y-axis)
//    cameraForward.y = 0;
//    cameraRight.y = 0;

//    cameraForward.normalize();
//    cameraRight.normalize();

//    const movement = new pc.Vec3();
//    const speed = this.app.keyboard.isPressed(pc.KEY_SHIFT)
//      ? this.fastSpeed
//      : this.speed;

//    // Keyboard-based movement (WASD or arrow keys)
//    if (
//      this.app.keyboard.isPressed(pc.KEY_W) ||
//      this.app.keyboard.isPressed(pc.KEY_UP)
//    ) {
//      movement.add(cameraForward);
//    }
//    if (
//      this.app.keyboard.isPressed(pc.KEY_S) ||
//      this.app.keyboard.isPressed(pc.KEY_DOWN)
//    ) {
//      movement.sub(cameraForward);
//    }
//    if (
//      this.app.keyboard.isPressed(pc.KEY_A) ||
//      this.app.keyboard.isPressed(pc.KEY_LEFT)
//    ) {
//      movement.sub(cameraRight);
//    }
//    if (
//      this.app.keyboard.isPressed(pc.KEY_D) ||
//      this.app.keyboard.isPressed(pc.KEY_RIGHT)
//    ) {
//      movement.add(cameraRight);
//    }

//    if (!movement.equals(pc.Vec3.ZERO)) {
//      movement.normalize().scale(speed);
//    }

//    const currentVelocity = rigidbody.linearVelocity;
//    const lerpFactor = Math.min(dt * 12, 1);

//    // Update target velocity (only x and z components for horizontal movement)
//    this.targetVelocity.x = movement.x;
//    this.targetVelocity.z = movement.z;
//    this.targetVelocity.y = currentVelocity.y;

//    // Smoothly interpolate between current and target velocity for a smoother movement
//    this.velocity.lerp(currentVelocity, this.targetVelocity, lerpFactor);

//    // if (this.app.keyboard.wasPressed(pc.KEY_SPACE)) {
//    //   this.velocity.y = 4;
//    // }

//    rigidbody.linearVelocity = this.velocity;
//  };

//  // Reset isMoving when mouse is released, to ensure it doesn't interfere with the drag mode
//  CharacterController.prototype.onMouseUp = function (event) {
//    // Check if the event is triggered on an overlay element
//    if (event.element && event.element.classList.contains("overlay-element")) {
//      return; // Ignore events on the overlay
//    }
//    if (event.button === pc.MOUSEBUTTON_LEFT) {
//      this.isMouseDown = false;
//      // this.isDragMode = false;
//      document.body.style.cursor = "grab";
//    }
//  };

//  // Ensure mouse dragging only occurs if the character isn't moving
//  CharacterController.prototype.onMouseDown = function (event) {
//    if (event.element && event.element.classList.contains("overlay-element")) {
//      return; // Ignore events on the overlay
//    }
//    if (event.button === pc.MOUSEBUTTON_LEFT) {
//      // if (!this.isMoving) {
//      // this.isDragMode = true;
//      this.isMouseDown = true;
//      this.lastX = event.x;
//      this.lastY = event.y;
//      document.body.style.cursor = "grabbing";
//      // }
//    }
//  };

//  CharacterController.prototype.destroy = function () {
//    document.removeEventListener("mousemove", this.onMouseMove);
//    document.removeEventListener("mouseleave", this.onMouseLeave);
//    this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
//    this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
//  };
//}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// // export function FpsPlaycanvas(pc, canvasRef) {
// //   const CharacterController = pc.createScript("characterController");

// import { l } from "vite/dist/node/types.d-aGj9QkWt";

// //   // Attributes definition
// //   CharacterController.attributes.add("camera", {
// //     type: "entity",
// //     title: "Camera Entity",
// //   });

// //   CharacterController.attributes.add("speed", {
// //     type: "number",
// //     default: 8,
// //     title: "Movement Speed",
// //   });

// //   CharacterController.attributes.add("fastSpeed", {
// //     type: "number",
// //     default: 16,
// //     title: "Fast Movement Speed",
// //   });

// //   CharacterController.attributes.add("sensitivity", {
// //     type: "number",
// //     default: 0.3,
// //     title: "Look Sensitivity",
// //   });

// //   CharacterController.attributes.add("groundCheckDistance", {
// //     type: "number",
// //     default: 1.1,
// //     title: "Ground Check Distance",
// //   });

// //   // Initialize
// //   CharacterController.prototype.initialize = function () {
// //     this.pitch = new pc.Quat();
// //     this.yaw = new pc.Quat();
// //     this.velocity = new pc.Vec3();
// //     this.look = new pc.Vec2(0, 0);
// //     this.isGrounded = false;
// //     this.moveDirection = new pc.Vec3();

// //     // Store camera reference
// //     this.cameraEntity = this.camera || this.entity.findByName("camera");

// //     // Initialize the euler angles for smooth rotation
// //     this.eulers = new pc.Vec3();

// //     // Bind methods
// //     this.onMouseMove = this.onMouseMove.bind(this);
// //     this.onCollisionStart = this.onCollisionStart.bind(this);

// //     // Add event listeners
// //     document.addEventListener("mousemove", this.onMouseMove);
// //     this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);

// //     if (this.entity.collision) {
// //       this.entity.collision.on("collisionstart", this.onCollisionStart);
// //     }

// //     if (!this.entity.rigidbody) {
// //       console.warn("CharacterController needs a rigidbody component");
// //       return;
// //     }

// //     const rigidbody = this.entity.rigidbody;
// //     rigidbody.enableContinuousCollision = true;
// //   };

// //   // Mouse movement handler
// //   CharacterController.prototype.onMouseMove = function (e) {
// //     if (document.pointerLockElement) {
// //       // Update look angles with clamping
// //       this.look.x = pc.math.clamp(
// //         this.look.x - e.movementY * this.sensitivity,
// //         -89,
// //         89
// //       );
// //       this.look.y -= e.movementX * this.sensitivity;

// //       // Create quaternion rotations for pitch and yaw
// //       this.pitch.setFromEulerAngles(this.look.x, this.look.y, 0);
// //       this.yaw.setFromEulerAngles(0, this.look.y, 0);

// //       // Apply rotation to the character body (only yaw)
// //       this.entity.setLocalRotation(this.yaw);

// //       // Apply pitch to the camera
// //       if (this.cameraEntity) {
// //         this.cameraEntity.setLocalRotation(this.pitch);
// //       }
// //     }
// //   };

// //   // Collision handler
// //   CharacterController.prototype.onCollisionStart = function (result) {
// //     const impact = result.contacts[0].normal.scale(result.impulse);
// //     if (impact.y > 0) {
// //       this.isGrounded = true;
// //     }
// //   };

// //   // Update method
// //   CharacterController.prototype.update = function (dt) {
// //     if (!this.entity.rigidbody) return;

// //     const rigidbody = this.entity.rigidbody;

// //     // Ground check
// //     // const rayStart = this.entity.getPosition().clone();
// //     // rayStart.y += 0.1; // Start slightly above to avoid self-collision
// //     // const rayEnd = rayStart.clone();
// //     // rayEnd.y -= this.groundCheckDistance;

// //     // const result = this.app.systems.rigidbody.raycastFirst(rayStart, rayEnd);
// //     // this.isGrounded = !!result;

// //     // Get camera directions
// //     const cameraForward = this.cameraEntity.forward.clone();
// //     const cameraRight = this.cameraEntity.right.clone();

// //     // Flatten the directions
// //     cameraForward.y = 0;
// //     cameraRight.y = 0;

// //     // Normalize the flattened directions
// //     cameraForward.normalize();
// //     cameraRight.normalize();

// //     // Calculate movement direction
// //     const movement = new pc.Vec3();
// //     const speed = this.app.keyboard.isPressed(pc.KEY_SHIFT)
// //       ? this.fastSpeed
// //       : this.speed;

// //     // Handle movement input
// //     if (
// //       this.app.keyboard.isPressed(pc.KEY_W) ||
// //       this.app.keyboard.isPressed(pc.KEY_UP)
// //     ) {
// //       movement.add(cameraForward);
// //     }
// //     if (
// //       this.app.keyboard.isPressed(pc.KEY_S) ||
// //       this.app.keyboard.isPressed(pc.KEY_DOWN)
// //     ) {
// //       movement.sub(cameraForward);
// //     }
// //     if (
// //       this.app.keyboard.isPressed(pc.KEY_A) ||
// //       this.app.keyboard.isPressed(pc.KEY_LEFT)
// //     ) {
// //       movement.sub(cameraRight);
// //     }
// //     if (
// //       this.app.keyboard.isPressed(pc.KEY_D) ||
// //       this.app.keyboard.isPressed(pc.KEY_RIGHT)
// //     ) {
// //       movement.add(cameraRight);
// //     }

// //     // Normalize and scale movement
// //     if (!movement.equals(pc.Vec3.ZERO)) {
// //       movement.normalize();
// //       movement.scale(speed * dt);
// //     }

// //     // Get current velocity and apply movement with smoother lerp
// //     const currentVelocity = rigidbody.linearVelocity;
// //     const lerpFactor = Math.min(dt * 8, 1);

// //     // Smooth horizontal movement
// //     this.velocity.x = pc.math.lerp(currentVelocity.x, movement.x, lerpFactor);
// //     this.velocity.z = pc.math.lerp(currentVelocity.z, movement.z, lerpFactor);

// //     // Maintain vertical velocity
// //     this.velocity.y = currentVelocity.y;

// //     // Handle jumping
// //     if (this.app.keyboard.wasPressed(pc.KEY_SPACE) && this.isGrounded) {
// //       this.velocity.y = 7;
// //       this.isGrounded = false;
// //     }

// //     // Apply the velocity
// //     rigidbody.linearVelocity = this.velocity;
// //   };

// //   // Cleanup
// //   CharacterController.prototype.destroy = function () {
// //     document.removeEventListener("mousemove", this.onMouseMove);
// //     this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
// //     if (this.entity.collision) {
// //       this.entity.collision.off("collisionstart", this.onCollisionStart);
// //     }
// //   };

// //   CharacterController.prototype.onMouseDown = function () {
// //     canvasRef.current.requestPointerLock();
// //   };
// // }

// export function FpsPlaycanvas(pc, canvasRef) {
//   const CharacterController = pc.createScript("characterController");

//   CharacterController.attributes.add("camera", {
//     type: "entity",
//     title: "Camera Entity",
//   });

//   CharacterController.attributes.add("speed", {
//     type: "number",
//     default: 10,
//     title: "Movement Speed",
//   });

//   CharacterController.attributes.add("fastSpeed", {
//     type: "number",
//     default: 20,
//     title: "Fast Movement Speed",
//   });

//   CharacterController.attributes.add("sensitivity", {
//     type: "number",
//     default: 0.3,
//     title: "Look Sensitivity",
//   });

//   CharacterController.attributes.add("lookSpeed", {
//     type: "number",
//     default: 0.2,
//     title: "Drag Look Speed",
//   });

//   CharacterController.prototype.initialize = function () {
//     this.pitch = new pc.Quat();
//     this.yaw = new pc.Quat();
//     this.velocity = new pc.Vec3();
//     this.look = new pc.Vec2(0, 0);
//     this.targetVelocity = new pc.Vec3();

//     // Drag camera states
//     this.isMouseDown = false;
//     this.lastX = 0;
//     this.lastY = 0;
//     this.eulers = new pc.Vec3();

//     // Mode tracking
//     this.isDragMode = false;

//     // Store camera reference
//     this.cameraEntity = this.camera || this.entity.findByName("camera");

//     // Get initial rotation
//     var angles = this.entity.getLocalEulerAngles();
//     this.eulers.x = angles.x;
//     this.eulers.y = angles.y;

//     // Bind methods
//     this.onMouseMove = this.onMouseMove.bind(this);
//     this.onMouseDown = this.onMouseDown.bind(this);
//     this.onMouseUp = this.onMouseUp.bind(this);
//     this.onMouseLeave = this.onMouseLeave.bind(this);

//     // Add event listeners
//     document.addEventListener("mousemove", this.onMouseMove);
//     document.addEventListener("mouseleave", this.onMouseLeave);
//     this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
//     this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);

//     if (!this.entity.rigidbody) {
//       console.warn("CharacterController needs a rigidbody component");
//       return;
//     }

//     const rigidbody = this.entity.rigidbody;
//     rigidbody.linearDamping = 0.9;
//     rigidbody.angularDamping = 0.9;
//     rigidbody.linearFactor = new pc.Vec3(1, 1, 1);
//     rigidbody.angularFactor = new pc.Vec3(0, 0, 0);
//   };

//   // CharacterController.prototype.onMouseDown = function (event) {
//   //   if (event.button === pc.MOUSEBUTTON_LEFT) {
//   //     this.isDragMode = true;
//   //     this.isMouseDown = true;
//   //     this.lastX = event.x;
//   //     this.lastY = event.y;
//   //     document.body.style.cursor = "grab";
//   //   }
//   // };

//   CharacterController.prototype.onMouseLeave = function () {
//     // Instead of stopping drag, we'll keep tracking if mouse button is still down
//     if (this.isMouseDown) {
//       this.isDragMode = false;
//     }
//     document.body.style.cursor = "grab";
//   };

//   CharacterController.prototype.onMouseUp = function (event) {
//     if (event.button === pc.MOUSEBUTTON_LEFT) {
//       this.isMouseDown = false;
//       this.isDragMode = false;
//       document.body.style.cursor = "grab";

//       // Request pointer lock when releasing drag
//       // if (event.button === pc.MOUSEBUTTON_LEFT) {
//       //   canvasRef.current.requestPointerLock();
//       // }
//     }
//   };

//   CharacterController.prototype.onMouseDown = function (event) {
//     if (event.button === pc.MOUSEBUTTON_LEFT) {
//       // Cast a ray from the camera to check for clickable entities
//       // const camera = this.cameraEntity.camera;
//       // const from = camera.entity.getPosition();
//       // const to = camera.screenToWorld(event.x, event.y, camera.farClip);

//       // const result = this.app.systems.rigidbody.raycastFirst(from, to);

//       // if (result && result.entity.script && result.entity.script.isClickable) {
//       //   // If we hit a clickable entity, trigger its click handler
//       //   result.entity.script.onClick && result.entity.script.onClick();
//       //   document.body.style.cursor = "hover";
//       // } else {
//       // If we didn't hit anything clickable, start camera drag
//       this.isDragMode = true;
//       this.isMouseDown = true;
//       this.lastX = event.x;
//       this.lastY = event.y;
//       document.body.style.cursor = "grabbing";
//       // }
//     }
//   };

//   CharacterController.prototype.onMouseMove = function (e) {
//     if (this.isDragMode && this.isMouseDown) {
//       // Drag camera logic
//       const dx = e.x - this.lastX;
//       const dy = e.y - this.lastY;
//       this.lastX = e.x;
//       this.lastY = e.y;

//       // Update both x and y euler angles
//       this.eulers.x -= dy * this.lookSpeed * 0.5;
//       this.eulers.y -= dx * this.lookSpeed * 0.5;

//       // Clamp vertical rotation
//       this.eulers.x = pc.math.clamp(this.eulers.x, -89, 89);

//       // Create quaternions for pitch and yaw
//       this.pitch.setFromEulerAngles(0, this.eulers.y, 0);
//       this.yaw.setFromEulerAngles(this.eulers.x, this.eulers.y, 0);

//       // Apply yaw to entity (horizontal rotation)
//       this.entity.setLocalRotation(this.yaw);

//       // Apply pitch to camera (vertical rotation)
//       if (this.cameraEntity) {
//         this.cameraEntity.setLocalRotation(this.pitch);
//       }
//     } else if (document.pointerLockElement) {
//       // FPS camera logic (remains the same)
//       this.look.x = pc.math.clamp(
//         this.look.x - e.movementY * this.sensitivity,
//         -89,
//         89
//       );
//       this.look.y -= e.movementX * this.sensitivity;

//       this.pitch.setFromEulerAngles(this.look.x, 0, 0);
//       this.yaw.setFromEulerAngles(0, this.look.y, 0);

//       this.entity.setLocalRotation(this.yaw);

//       if (this.cameraEntity) {
//         this.cameraEntity.setLocalRotation(this.pitch);
//       }
//     }
//   };

//   CharacterController.prototype.update = function (dt) {
//     if (!this.entity.rigidbody) return;

//     const rigidbody = this.entity.rigidbody;
//     const cameraForward = this.cameraEntity.forward.clone();
//     const cameraRight = this.cameraEntity.right.clone();

//     cameraForward.y = 0;
//     cameraRight.y = 0;

//     cameraForward.normalize();
//     cameraRight.normalize();

//     const movement = new pc.Vec3();
//     const speed = this.app.keyboard.isPressed(pc.KEY_SHIFT)
//       ? this.fastSpeed
//       : this.speed;

//     if (
//       this.app.keyboard.isPressed(pc.KEY_W) ||
//       this.app.keyboard.isPressed(pc.KEY_UP)
//     ) {
//       movement.add(cameraForward);
//     }
//     if (
//       this.app.keyboard.isPressed(pc.KEY_S) ||
//       this.app.keyboard.isPressed(pc.KEY_DOWN)
//     ) {
//       movement.sub(cameraForward);
//     }
//     if (
//       this.app.keyboard.isPressed(pc.KEY_A) ||
//       this.app.keyboard.isPressed(pc.KEY_LEFT)
//     ) {
//       movement.sub(cameraRight);
//     }
//     if (
//       this.app.keyboard.isPressed(pc.KEY_D) ||
//       this.app.keyboard.isPressed(pc.KEY_RIGHT)
//     ) {
//       movement.add(cameraRight);
//     }

//     if (!movement.equals(pc.Vec3.ZERO)) {
//       movement.normalize().scale(speed);
//     }

//     const currentVelocity = rigidbody.linearVelocity;
//     const lerpFactor = Math.min(dt * 12, 1);

//     // Update target velocity
//     this.targetVelocity.x = movement.x;
//     this.targetVelocity.z = movement.z;
//     this.targetVelocity.y = currentVelocity.y;

//     // this.velocity.x = pc.math.lerp(currentVelocity.x, movement.x, lerpFactor);
//     // this.velocity.z = pc.math.lerp(currentVelocity.z, movement.z, lerpFactor);
//     // this.velocity.y = currentVelocity.y;

//     // Smoothly interpolate between current and target velocity
//     this.velocity.lerp(currentVelocity, this.targetVelocity, lerpFactor);

//     rigidbody.linearVelocity = this.velocity;

//     // if (this.app.keyboard.wasPressed(pc.KEY_SPACE)) {
//     //   const rayEnd = new pc.Vec3();
//     //   const rayStart = this.entity.getPosition().clone();
//     //   rayEnd.copy(rayStart).add(new pc.Vec3(0, -1.1, 0));

//     //   const result = this.app.systems.rigidbody.raycastFirst(rayStart, rayEnd);
//     //   if (result) {
//     //     this.velocity.y = 7;
//     //     rigidbody.linearVelocity = this.velocity;
//     //   }
//     // }
//   };

//   CharacterController.prototype.destroy = function () {
//     document.removeEventListener("mousemove", this.onMouseMove);
//     document.removeEventListener("mouseleave", this.onMouseLeave);
//     this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
//     this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
//   };
// }
