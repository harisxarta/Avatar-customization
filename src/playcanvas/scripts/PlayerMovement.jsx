export function registerPlayerMovementScript(pc) {
  if (pc.scripts && pc.scripts.playerMovement) return;

  var PlayerMovement = pc.createScript("playerMovement");

  PlayerMovement.attributes.add("speed", { type: "number", default: 0.09 });

  PlayerMovement.prototype.initialize = function () {
    var app = this.app;
    var cameraOrigin = this.entity.findByName("CameraOrigin");
    if (cameraOrigin) {
      var camera = cameraOrigin.findByName("Camera");
      if (camera) {
        this.cameraScript = camera.script.cameraMovement;
      }
    }
  };

  // Temp variable to avoid garbage collection
  PlayerMovement.worldDirection = new pc.Vec3();
  PlayerMovement.tempDirection = new pc.Vec3();

  PlayerMovement.prototype.update = function (dt) {
    var app = this.app;
    var worldDirection = PlayerMovement.worldDirection;
    worldDirection.set(0, 0, 0);

    var tempDirection = PlayerMovement.tempDirection;

    var forward = this.entity.forward;
    var right = this.entity.right;

    var x = 0;
    var z = 0;

    if (app.keyboard.isPressed(pc.KEY_A)) {
      x += 1;
    }

    if (app.keyboard.isPressed(pc.KEY_D)) {
      x -= 1;
    }

    if (app.keyboard.isPressed(pc.KEY_W)) {
      z -= 1;
    }

    if (app.keyboard.isPressed(pc.KEY_S)) {
      z += 1;
    }

    if (x !== 0 || z !== 0) {
      worldDirection.add(tempDirection.copy(forward).mulScalar(z));
      worldDirection.add(tempDirection.copy(right).mulScalar(x));
      worldDirection.normalize();

      var pos = new pc.Vec3(worldDirection.x * dt, 0, worldDirection.z * dt);
      pos.normalize().scale(this.speed);
      pos.add(this.entity.getPosition());

      // Rotate player to face camera direction
      if (this.cameraScript) {
        var targetY = this.cameraScript.eulers.x + 180;
        var rot = new pc.Vec3(0, targetY, 0);
        this.entity.rigidbody.teleport(pos, rot);
      } else {
        this.entity.rigidbody.teleport(pos);
      }
    }

    // Update animations if available
    if (this.entity.anim) {
      this.entity.anim.setFloat("xDirection", x);
      this.entity.anim.setFloat("zDirection", z);
    }
  };
}

//var PlayerMovement = pc.createScript("playerMovement");

//PlayerMovement.attributes.add("speed", { type: "number", default: 0.09 });

//PlayerMovement.prototype.initialize = function () {
//  var app = this.app;
//  var camera = app.root.findByName("Camera");
//  this.cameraScript = camera.script.cameraMovement;
//};

//// Temp variable to avoid garbarge colleciton
//PlayerMovement.worldDirection = new pc.Vec3();
//PlayerMovement.tempDirection = new pc.Vec3();

//PlayerMovement.prototype.update = function (dt) {
//  var app = this.app;
//  var worldDirection = PlayerMovement.worldDirection;
//  worldDirection.set(0, 0, 0);

//  var tempDirection = PlayerMovement.tempDirection;

//  var forward = this.entity.forward;
//  var right = this.entity.right;

//  var x = 0;
//  var z = 0;

//  if (app.keyboard.isPressed(pc.KEY_A)) {
//    x += 1;
//  }

//  if (app.keyboard.isPressed(pc.KEY_D)) {
//    x -= 1;
//  }

//  if (app.keyboard.isPressed(pc.KEY_W)) {
//    z -= 1;
//  }

//  if (app.keyboard.isPressed(pc.KEY_S)) {
//    z += 1;
//  }

//  if (x !== 0 || z !== 0) {
//    worldDirection.add(tempDirection.copy(forward).mulScalar(z));
//    worldDirection.add(tempDirection.copy(right).mulScalar(x));
//    worldDirection.normalize();

//    var pos = new pc.Vec3(worldDirection.x * dt, 0, worldDirection.z * dt);
//    pos.normalize().scale(this.speed);
//    pos.add(this.entity.getPosition());

//    var targetY = this.cameraScript.eulers.x + 360;
//    var rot = new pc.Vec3(0, targetY, 0);

//    this.entity.rigidbody.teleport(pos, rot);
//  }

//  this.entity.anim.setFloat("xDirection", x);
//  this.entity.anim.setFloat("zDirection", z);
//};
