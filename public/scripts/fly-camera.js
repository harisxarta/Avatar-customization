// src/FlyCamera.js
export function registerFlyCameraScript(pc) {
  var FlyCamera = pc.createScript("flyCamera");
  FlyCamera.attributes.add("speed", { type: "number", default: 10 });
  FlyCamera.attributes.add("fastSpeed", { type: "number", default: 20 });
  FlyCamera.attributes.add("mode", {
    type: "number",
    default: 0,
    enum: [{ Lock: 0 }, { Drag: 1 }],
  });

  FlyCamera.prototype.initialize = function () {
    var eulers = this.entity.getLocalEulerAngles();
    this.ex = eulers.x;
    this.ey = eulers.y;
    this.moved = false;
    this.lmbDown = false;
    this.app.mouse.disableContextMenu();
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
  };

  FlyCamera.prototype.update = function (dt) {
    this.entity.setLocalEulerAngles(this.ex, this.ey, 0);
    var app = this.app;
    var speed = this.speed;
    if (app.keyboard.isPressed(pc.KEY_SHIFT)) speed = this.fastSpeed;
    if (app.keyboard.isPressed(pc.KEY_UP) || app.keyboard.isPressed(pc.KEY_W))
      this.entity.translateLocal(0, 0, -speed * dt);
    else if (
      app.keyboard.isPressed(pc.KEY_DOWN) ||
      app.keyboard.isPressed(pc.KEY_S)
    )
      this.entity.translateLocal(0, 0, speed * dt);
    if (app.keyboard.isPressed(pc.KEY_LEFT) || app.keyboard.isPressed(pc.KEY_A))
      this.entity.translateLocal(-speed * dt, 0, 0);
    else if (
      app.keyboard.isPressed(pc.KEY_RIGHT) ||
      app.keyboard.isPressed(pc.KEY_D)
    )
      this.entity.translateLocal(speed * dt, 0, 0);
  };

  FlyCamera.prototype.onMouseMove = function (event) {
    if (!this.mode) {
      if (!pc.Mouse.isPointerLocked()) return;
    } else {
      if (!this.lmbDown) return;
    }
    if (!this.moved) {
      this.moved = true;
      return;
    }
    this.ex -= event.dy / 5;
    this.ex = pc.math.clamp(this.ex, -90, 90);
    this.ey -= event.dx / 5;
  };

  FlyCamera.prototype.onMouseDown = function (event) {
    if (event.button === 0) {
      this.lmbDown = true;
      if (!this.mode && !pc.Mouse.isPointerLocked()) {
        this.app.mouse.enablePointerLock();
      }
    }
  };

  FlyCamera.prototype.onMouseUp = function (event) {
    if (event.button === 0) this.lmbDown = false;
  };
}
