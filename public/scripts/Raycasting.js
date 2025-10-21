export function Raycasting(pc, editButton) {
  var Raycast = pc.createScript("raycast");

  Raycast.attributes.add("camera", {
    type: "entity",
    title: "Camera Entity",
  });
  Raycast.prototype.initialize = function () {
    // Find the first entity in the hierarchy with the name 'Camera'
    // this.cameraEntity = this.app.root.findByName("camera");

    this.cameraEntity = this.camera || this.entity.findByName("camera");
    console.log("CAMERA", this.cameraEntity);
    // Add a mousedown event handler
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.mouseDown, this);
    // Here we have to have a collision component added to the nodes we care about.
    // haven't coded it ...
  };

  Raycast.prototype.mouseDown = function (e) {
    console.log("Mouse down event detected:", e);
    this.doRaycast(e);
  };

  Raycast.prototype.doRaycast = function (screenPosition) {
    console.log("SCREEN", screenPosition);
    console.log(this.cameraEntity);
    // The vec3 to raycast from
    var from = this.cameraEntity.getPosition();
    console.log("FROM", from);
    // The vec3 to raycast to
    var to = this.cameraEntity.camera.screenToWorld(
      screenPosition.x,
      screenPosition.y,
      this.cameraEntity.camera.farClip
    );

    // Raycast between the two points
    var result = this.app.systems.rigidbody.raycastFirst(from, to);
    // here result is a combination of an entity, vector and point
    console.log("EDIT BUTTON IN SCRIPT", editButton);
    if (editButton) {
      console.log("Raycasting result", result.entity.name);
      console.log("Raycasting result", result.entity);
    }
  };

  Raycast.prototype.swap = function (oldInstance) {
    console.log("Raycast script hot-swapped.");
  };
}
