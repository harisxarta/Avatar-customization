export function registerRaycastScript(pc) {
  if (pc.scripts && pc.scripts.raycast) return;
  const Raycast = pc.createScript("raycast");
  Raycast.attributes.add("camera", { type: "entity", title: "Camera Entity" });

  Raycast.prototype.initialize = function () {
    this.cameraEntity = this.camera || this.entity.findByName("camera");
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.mouseDown, this);
  };
  Raycast.prototype.mouseDown = function (e) {
    if (e.event && e.event.target.closest(".non-penetrable")) {
      return;
    }
    this.doRaycast(e.x, e.y);
  };
  Raycast.prototype.doRaycast = function (x, y) {
    const from = this.cameraEntity.getPosition();
    const to = this.cameraEntity.camera.screenToWorld(
      x,
      y,
      this.cameraEntity.camera.farClip
    );
    const result = this.app.systems.rigidbody.raycastFirst(from, to);

    if (result && result.entity) {
      console.log("Hit :", result.entity.name);
      const entity = result.entity;
      if (entity.name?.startsWith("Model")) {
        console.log("Hit a model:", entity);
      }

      if (
        entity.tags?.has("frame") ||
        (entity.name && entity.name.toLowerCase().includes("frame"))
      ) {
        if (window.onFrameClicked) window.onFrameClicked(entity);
      }
    }
  };
}

//reusable
export function performRaycast(app, cameraEntity, x, y) {
  if (!app || !cameraEntity?.camera) return null;

  const from = cameraEntity.getPosition();
  const to = cameraEntity.camera.screenToWorld(
    x,
    y,
    cameraEntity.camera.farClip
  );

  return app.systems.rigidbody.raycastFirst(from, to);
}
