export function registerCameraMovementScript(pc) {
  if (pc.scripts && pc.scripts.cameraMovement) return;

  var CameraMovement = pc.createScript("cameraMovement");

  CameraMovement.attributes.add("mouseSpeed", {
    type: "number",
    default: 1,
    description: "Mouse Sensitivity",
  });

  // Called once after all resources are loaded and before the first update
  CameraMovement.prototype.initialize = function () {
    this.eulers = new pc.Vec3();
    this.touchCoords = new pc.Vec2();

    var app = this.app;

    // dragging state
    this.isDragging = false;

    // cache canvas for cursor changes
    this.canvas = app.graphicsDevice && app.graphicsDevice.canvas;
    if (this.canvas) this.canvas.style.cursor = "auto";

    app.mouse.on("mousemove", this.onMouseMove, this);
    app.mouse.on("mousedown", this.onMouseDown, this);
    app.mouse.on("mouseup", this.onMouseUp, this);
    app.mouse.on("mouseleave", this.onMouseUp, this);

    // handle pointer lock changes to keep state consistent
    this._onPointerLockChange = this.onPointerLockChange.bind(this);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);

    this.rayEnd = app.root.findByName("RaycastEndPoint");

    this.on(
      "destroy",
      function () {
        app.mouse.off("mousemove", this.onMouseMove, this);
        app.mouse.off("mousedown", this.onMouseDown, this);
        app.mouse.off("mouseup", this.onMouseUp, this);
        app.mouse.off("mouseleave", this.onMouseUp, this);
        document.removeEventListener(
          "pointerlockchange",
          this._onPointerLockChange
        );
      },
      this
    );
  };

  CameraMovement.prototype.postUpdate = function (dt) {
    var originEntity = this.entity.parent;

    var targetY = this.eulers.x + 180;
    var targetX = this.eulers.y;

    var targetAng = new pc.Vec3(-targetX, targetY, 0);

    originEntity.setEulerAngles(targetAng);

    this.entity.setPosition(this.getWorldPoint());

    this.entity.lookAt(originEntity.getPosition());
  };

  CameraMovement.prototype.onMouseMove = function (e) {
    // apply rotation while dragging OR when pointer is locked
    if (this.isDragging || pc.Mouse.isPointerLocked()) {
      var dx = e.dx || 0;
      var dy = e.dy || 0;

      this.eulers.x -= ((this.mouseSpeed * dx) / 10) % 360;
      this.eulers.y -= ((this.mouseSpeed * dy) / 10) % 360;

      if (this.eulers.x < 0) this.eulers.x += 360;
      if (this.eulers.y < 0) this.eulers.y += 360;
    }
  };

  CameraMovement.prototype.onMouseDown = function (e) {
    // start dragging on left button; keep OS cursor visible (no pointer lock)
    if (typeof e.button === "undefined" || e.button === pc.MOUSEBUTTON_LEFT) {
      this.isDragging = true;
      if (this.canvas) this.canvas.style.cursor = "grabbing";
      if (e.event && e.event.preventDefault) e.event.preventDefault();
    }
  };

  CameraMovement.prototype.onMouseUp = function (e) {
    this.isDragging = false;
    if (this.canvas) this.canvas.style.cursor = "auto";
    // do not disable pointer lock here; pointer lock is not requested in onMouseDown
  };

  CameraMovement.prototype.onPointerLockChange = function () {
    if (!pc.Mouse.isPointerLocked()) {
      // ensure dragging is cleared if pointer lock is lost externally
      this.isDragging = false;
      if (this.canvas) this.canvas.style.cursor = "auto";
    }
  };

  CameraMovement.prototype.getWorldPoint = function () {
    var from = this.entity.parent.getPosition();
    var to = this.rayEnd.getPosition();

    var hitPoint = to;

    var app = this.app;
    if (app.systems.rigidbody) {
      var hit = app.systems.rigidbody.raycastFirst(from, to);
      return hit ? hit.point : to;
    }

    return to;
  };
}

//export function registerCameraMovementScript(pc) {
//  if (pc.scripts && pc.scripts.cameraMovement) return;

//  var CameraMovement = pc.createScript("cameraMovement");

//  CameraMovement.attributes.add("mouseSpeed", {
//    type: "number",
//    default: 1.4,
//    description: "Mouse Sensitivity",
//  });

//  // Called once after all resources are loaded and before the first update
//  CameraMovement.prototype.initialize = function () {
//    this.eulers = new pc.Vec3();
//    this.touchCoords = new pc.Vec2();

//    var app = this.app;
//    app.mouse.on("mousemove", this.onMouseMove, this);
//    app.mouse.on("mousedown", this.onMouseDown, this);

//    this.rayEnd = app.root.findByName("RaycastEndPoint");

//    this.on(
//      "destroy",
//      function () {
//        app.mouse.off("mousemove", this.onMouseMove, this);
//        app.mouse.off("mousedown", this.onMouseDown, this);
//      },
//      this
//    );
//  };

//  CameraMovement.prototype.postUpdate = function (dt) {
//    var originEntity = this.entity.parent;

//    var targetY = this.eulers.x + 180;
//    var targetX = this.eulers.y;

//    var targetAng = new pc.Vec3(-targetX, targetY, 0);

//    originEntity.setEulerAngles(targetAng);

//    this.entity.setPosition(this.getWorldPoint());

//    this.entity.lookAt(originEntity.getPosition());
//  };

//  CameraMovement.prototype.onMouseMove = function (e) {
//    if (pc.Mouse.isPointerLocked()) {
//      this.eulers.x -= ((this.mouseSpeed * e.dx) / 60) % 360;
//      this.eulers.y += ((this.mouseSpeed * e.dy) / 60) % 360;

//      if (this.eulers.x < 0) this.eulers.x += 360;
//      if (this.eulers.y < 0) this.eulers.y += 360;
//    }
//  };

//  CameraMovement.prototype.onMouseDown = function (e) {
//    //this.app.mouse.enablePointerLock();
//  };

//  CameraMovement.prototype.getWorldPoint = function () {
//    var from = this.entity.parent.getPosition();
//    var to = this.rayEnd.getPosition();

//    var hitPoint = to;

//    var app = this.app;
//    if (app.systems.rigidbody) {
//      var hit = app.systems.rigidbody.raycastFirst(from, to);
//      return hit ? hit.point : to;
//    }

//    return to;
//  };
//}
