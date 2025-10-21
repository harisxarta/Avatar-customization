export function DraggableModel(pc) {
  var Draggable = pc.createScript("draggable");

  /**
   * Attributes
   */
  Draggable.attributes.add("cameraEntity", {
    type: "entity",
    title: "Camera Entity",
    description: "The camera used for raycasting",
  });

  /**
   * Initialize
   */
  Draggable.prototype.initialize = function () {
    // Keep track if we are dragging or not
    this.isDragging = false;

    // Used to store where on the plane the user first clicked
    this.dragPlanePoint = new pc.Vec3();

    // Store the offset between the entity's position and the raycast hit
    this.entityPickOffset = new pc.Vec3();

    // We’ll define a plane for dragging the object (e.g. horizontal plane at y=0).
    // If you want to drag along the object's own plane or a different plane, you can set it differently.
    this.dragPlaneNormal = new pc.Vec3(0, 1, 0); // y-up normal

    // Listen for mouse events
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
  };

  /**
   * onMouseDown
   */
  Draggable.prototype.onMouseDown = function (event) {
    // Convert mouse coords to PlayCanvas’ window coords
    var mouseX = event.x;
    var mouseY = event.y;

    // 1) Raycast from camera through mouse position
    var camera = this.cameraEntity.camera;
    var from = camera.screenToWorld(mouseX, mouseY, camera.nearClip);
    var to = camera.screenToWorld(mouseX, mouseY, camera.farClip);

    var hitResult = this.raycastFirst(from, to);
    if (hitResult && hitResult.entity === this.entity) {
      // We clicked on this model, so begin dragging
      this.isDragging = true;

      // 2) Find intersection point with our plane to compute the offset
      var planeHit = this.intersectPlane(from, to, this.dragPlaneNormal, 0); // plane at y=0
      if (planeHit) {
        // Offset between entity position and intersection
        this.entityPickOffset.copy(this.entity.getPosition()).sub(planeHit);
      }
    }
  };

  /**
   * onMouseMove
   */
  Draggable.prototype.onMouseMove = function (event) {
    if (!this.isDragging) return;

    var camera = this.cameraEntity.camera;
    var mouseX = event.x;
    var mouseY = event.y;
    var from = camera.screenToWorld(mouseX, mouseY, camera.nearClip);
    var to = camera.screenToWorld(mouseX, mouseY, camera.farClip);

    // Intersect the drag plane
    var planeHit = this.intersectPlane(from, to, this.dragPlaneNormal, 0);
    if (planeHit) {
      // Move the entity so it follows the mouse on that plane
      // Offset its position by the previously saved 'entityPickOffset'
      var newPos = planeHit.add(this.entityPickOffset);
      this.entity.setPosition(newPos);
    }
  };

  /**
   * onMouseUp
   */
  Draggable.prototype.onMouseUp = function (event) {
    this.isDragging = false;
  };

  /**
   * Helper: Raycast from "from" to "to", returning the first hit
   */
  Draggable.prototype.raycastFirst = function (from, to) {
    var result = this.app.systems.rigidbody.raycastFirst(from, to);
    return result;
  };

  /**
   * Helper: Intersect a ray with a plane defined by normal & planeConstant
   *  - planeConstant is the plane’s "d" in plane equation ax + by + cz + d = 0
   *  - If plane is y=0, then normal = (0,1,0), planeConstant = 0
   */
  Draggable.prototype.intersectPlane = function (
    rayStart,
    rayEnd,
    planeNormal,
    planeConstant
  ) {
    // Convert to a direction vector
    var dir = new pc.Vec3();
    dir.copy(rayEnd).sub(rayStart).normalize();

    // planeNormal . (pointOnPlane) + planeConstant = 0
    // Solve t where rayStart + dir * t intersects the plane
    var denom = planeNormal.dot(dir);
    if (Math.abs(denom) > 1e-6) {
      // distance from plane for rayStart
      var t = -(planeNormal.dot(rayStart) + planeConstant) / denom;
      if (t >= 0) {
        var hitPoint = new pc.Vec3();
        hitPoint.copy(rayStart).add(dir.scale(t));
        return hitPoint;
      }
    }
    return null;
  };
}
