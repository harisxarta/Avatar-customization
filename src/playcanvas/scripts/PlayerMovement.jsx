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

    if (app.keyboard.isPressed(pc.KEY_A)) x += 1;
    if (app.keyboard.isPressed(pc.KEY_D)) x -= 1;
    if (app.keyboard.isPressed(pc.KEY_W)) z -= 1;
    if (app.keyboard.isPressed(pc.KEY_S)) z += 1;

    if (x !== 0 || z !== 0) {
      // build movement direction in world space
      worldDirection.add(tempDirection.copy(forward).mulScalar(z));
      worldDirection.add(tempDirection.copy(right).mulScalar(x));
      worldDirection.normalize();

      // compute desired movement (XZ only)
      var moveVec = new pc.Vec3(
        worldDirection.x * this.speed,
        0,
        worldDirection.z * this.speed
      );

      // current and desired positions (world)
      var currentPos = this.entity.getPosition();

      // --- collision-aware clamped movement (prevents stutter) ---
      var moveLen = Math.sqrt(moveVec.x * moveVec.x + moveVec.z * moveVec.z);
      if (moveLen > 0) {
        // direction of movement (normalized)
        var moveDir = tempDirection.copy(moveVec).normalize();

        // target point if unobstructed
        var target = new pc.Vec3(
          currentPos.x + moveDir.x * moveLen,
          currentPos.y,
          currentPos.z + moveDir.z * moveLen
        );

        var hit = null;
        if (app.systems.rigidbody) {
          hit = app.systems.rigidbody.raycastFirst(currentPos, target);
        }

        var capsuleRadius = 0.28; // keep in sync with Home.jsx
        var safeOffset = 0.01;
        var actualMoveLen = moveLen;

        if (hit) {
          // distance from current position to hit point
          var distToHit = currentPos.distance(hit.point);
          // allow movement only up to (distance - capsuleRadius - offset)
          actualMoveLen = Math.max(0, distToHit - (capsuleRadius + safeOffset));

          if (actualMoveLen > 0) {
            // compute a sliding direction along the hit surface to avoid sticking
            var dot = moveDir.dot(hit.normal);
            var slideDir = new pc.Vec3(
              moveDir.x - hit.normal.x * dot,
              0,
              moveDir.z - hit.normal.z * dot
            );

            if (slideDir.lengthSq() > 1e-6) {
              slideDir.normalize();
              // try to move along the slide direction by the allowed distance
              moveDir.copy(slideDir);
            } else {
              // cannot slide, cancel movement
              moveDir.set(0, 0, 0);
              actualMoveLen = 0;
            }
          } else {
            // stuck, no movement allowed
            moveDir.set(0, 0, 0);
            actualMoveLen = 0;
          }
        }

        // compute final desired position
        var finalPos = new pc.Vec3(
          currentPos.x + moveDir.x * actualMoveLen,
          currentPos.y,
          currentPos.z + moveDir.z * actualMoveLen
        );

        // move/teleport rigidbody (kinematic) to final position
        if (this.entity.rigidbody) {
          // use physics API if rigidbody exists on the entity (provided by Home.jsx)
          if (this.cameraScript) {
            var targetY = this.cameraScript.eulers.x + 180;
            var rot = new pc.Vec3(0, targetY, 0);
            this.entity.rigidbody.teleport(finalPos, rot);
          } else {
            this.entity.rigidbody.teleport(finalPos);
          }
        } else {
          // fallback: direct transform when no physics components are present
          this.entity.setPosition(finalPos);
          if (this.cameraScript) {
            var targetY = this.cameraScript.eulers.x + 180;
            this.entity.setEulerAngles(0, targetY, 0);
          }
        }
      }
      // --- end collision-aware movement ---
    }

    // Update animations if available
    if (this.entity.anim) {
      this.entity.anim.setFloat("xDirection", x);
      this.entity.anim.setFloat("zDirection", z);
    }
  };
}
