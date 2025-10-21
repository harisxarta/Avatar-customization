var UpdateColorAndTexture = pc.createScript("updateColorAndTexture");
var editableEntities = [];
var selectedEntity = null;
var selectedTexture = null;
var selectedColor;
// var selector;
var editThemeFlag = false;
var tiling = null;

// initialize code called once per entity
UpdateColorAndTexture.prototype.initialize = function () {
  this.width = window.innerWidth;
  this.texturesToDelete = [];
  var { app } = this;
  var { camera } = app.root.findByName("Camera");

  app.on("resetInteriorStudio", this.handleResetInteriorStudio, this);
  app.on("updateMaterial", this.handleUpdateMaterial, this);
  app.on("removeTexture", this.removeTexture, this);
  app.on("rotateTexture", this.rotateTexture, this);
  app.on("removeColor", this.removeColor, this);
  app.on("updateChanges", this.handleUpdateChanges, this);
  app.on("editThemeFlag", this.handleEditThemeFlag, this);
  app.on("initialThemeUpdated", this.handleInitialUpdate, this);
  this.handleInitialState();

  document.addEventListener("click", function (event) {
    // if (!isAdmin || packageId === "free") return;
    event.preventDefault();
    event.stopPropagation();
    var mouseX = event.clientX;
    var mouseY = event.clientY;
    var from = camera.entity.camera.screenToWorld(
      mouseX,
      mouseY,
      camera.nearClip
    );
    var to = camera.entity.camera.screenToWorld(mouseX, mouseY, camera.farClip);
    const result = app.systems.rigidbody.raycastFirst(from, to);
    console.log(
      "entity name A:",
      result?.entity ? result.entity.name : "No result from raycast"
    );
    // app.fire("modelPlacement", result?.point);
    app.fire("rayCasting", result);
    if (!editThemeFlag) return;
    if (result?.entity && result.entity.tags.has("editable")) {
      console.log("entity name B:", result.entity);
      if (selectedEntity && selectedEntity.name === result.entity.name) return;
      // if (selector) selector.destroy();
      // const res = editableEntities.filter( ent => ent.name === result.entity.name )
      selectedColor = null;
      selectedTexture = "";
      selectedEntity = result.entity;
      // selectedEntity.textureUrl = res[0]?.texture?.textureUrl;
      app.fire("entitySelection", selectedEntity);

      if (selectedTexture || selectedColor) {
        app.fire("updateMaterial", {
          texture: selectedTexture,
          color: selectedColor,
        });
      }
      // createIndicator(selectedEntity);
    }
  });
};

UpdateColorAndTexture.prototype.handleInitialState = function () {
  const editEnts = this.app.root.findByTag("editable");
  editEnts.map((editEnt) => {
    editableEntities.push({
      name: editEnt.name,
      color: null,
      texture: null,
      tiling: null,
    });
  });
};

UpdateColorAndTexture.prototype.handleUpdateMaterial = function ({
  color,
  texture,
  tiling,
}) {
  if (!isAdmin || packageId === "free") return;
  selectedColor = color;
  selectedTexture = texture;
  tiling = tiling;

  if (selectedEntity && selectedTexture) {
    for (let i = 0; i < editableEntities.length; i++) {
      if (editableEntities[i].name === selectedEntity.name) {
        editableEntities[i].texture = selectedTexture;
      }
    }

    this.updateTextureAsset(
      selectedTexture.name,
      selectedTexture.textureUrl,
      0,
      selectedEntity
    );
  }

  if (selectedEntity && selectedColor) {
    const { r, g, b } = selectedColor;
    for (let i = 0; i < editableEntities.length; i++) {
      if (editableEntities[i].name === selectedEntity.name) {
        editableEntities[i].color = { r, g, b };
      }
    }

    this.updateColorAsset(selectedEntity, selectedColor);
  }

  if (selectedEntity && tiling) {
    for (let i = 0; i < editableEntities.length; i++) {
      if (editableEntities[i].name === selectedEntity.name) {
        editableEntities[i].tiling = tiling;
      }
    }
    this.updateTiling(selectedEntity, tiling);
  }
};
UpdateColorAndTexture.prototype.rotateTexture = function () {
  if (!isAdmin || packageId === "free") return;
  if (selectedEntity) {
    const meshInstances = selectedEntity?.render?._meshInstances;
    if (!meshInstances) return;
    for (let j = 0; j < meshInstances.length; j++) {
      const material = meshInstances[j]._material;
      if (
        material &&
        material.name.toLowerCase() !== "glass" &&
        material.diffuseMap
      ) {
        material.diffuseMapRotation += 90;
        material.update();
      }
    }
    for (let i = 0; i < editableEntities.length; i++) {
      if (editableEntities[i].name === selectedEntity.name) {
        const rotation =
          selectedEntity.render?.meshInstances[0]?.material?.diffuseMapRotation;
        if (editableEntities[i].texture)
          editableEntities[i].texture.textureRotation = rotation || 0;
      }
    }
    this.app.fire("entitySelection", selectedEntity);
  }
};

UpdateColorAndTexture.prototype.removeTexture = function () {
  if (!isAdmin || packageId === "free") return;
  if (selectedEntity) {
    for (let i = 0; i < editableEntities.length; i++) {
      if (editableEntities[i].name === selectedEntity.name) {
        this.texturesToDelete.push(editableEntities[i]?.texture?.name);
        editableEntities[i].texture = null;
      }
    }
    const meshInstances = selectedEntity?.render?._meshInstances;
    if (!meshInstances) return;
    for (let j = 0; j < meshInstances.length; j++) {
      const material = meshInstances[j]._material;
      if (
        material &&
        material.name.toLowerCase() !== "glass" &&
        material.diffuseMap
      ) {
        material.diffuseMapTiling = { x: 1, y: 1 };
        material.diffuseMap = null;
        material.update();
      }
    }
    this.app.fire("entitySelection", selectedEntity);
  }
};

UpdateColorAndTexture.prototype.removeColor = function () {
  if (selectedEntity) {
    for (let i = 0; i < editableEntities.length; i++) {
      if (editableEntities[i].name === selectedEntity.name) {
        editableEntities[i].color = null;
      }
    }

    const meshInstances = selectedEntity?.render?._meshInstances;
    if (!meshInstances) return;
    for (let j = 0; j < meshInstances.length; j++) {
      const material = meshInstances[j]._material;
      material.diffuse.set(1, 1, 1);
      material.update();
    }
  }
};

UpdateColorAndTexture.prototype.handleUpdateChanges = function () {
  if (!isAdmin || packageId === "free") return;

  const body = { settings: editableEntities };
  axios
    .post(`${ApiUrl}update-store-setting/${shopId}/${experienceId}`, body)
    .then((response) => {
      customToast("Theme Updated Successfully");
      this.app.fire("updatedChanges");
      if (this.texturesToDelete.length > 0)
        this.texturesToDelete.map((texName) => deleteFromAWS(texName));
    })
    .catch((error) => {
      console.error(error);
      customToast("Oops! Something went wrong", false);
    });
};

UpdateColorAndTexture.prototype.handleInitialUpdate = function () {
   if (packageId === "free") return;
  console.log("inside initial theme update fro color texture");
  axios
    .get(`${ApiUrl}store-setting/${shopId}/${experienceId}`)
    .then((response) => {
      if (!response?.data?.data) return;
      const { settings: entities } = response.data.data;
      if (entities && entities.length > 0) {
        if (editableEntities.length === entities) {
          editableEntities = entities;
        } else {
          // for (let obj of editableEntities) {
          //   if (!entities.some((item) => item.name === obj.name)) {
          //     entities.push(obj);
          //   }
          // }
          // filteredEntities = entities.filter((item) =>
          //   editableEntities.some((obj) => obj.name === item.name)
          // );
          // editableEntities = filteredEntities;
          editableEntities = entities;
        }
      }

      for (let i = 0; i < editableEntities.length; i++) {
        const searchedResult = this.app.root.findByName(
          editableEntities[i].name
        );
        if (!searchedResult) continue;
        const searchedEntity =
          searchedResult && searchedResult.tags.has("editable")
            ? searchedResult
            : searchedResult.children[0];
        // const searchedEntity = this.app.root.findByName(
        //   editableEntities[i].name
        // );
        console.log("entities searched", searchedEntity);
        if (editableEntities[i].color) {
          const { r, g, b } = editableEntities[i].color;
          this.updateColorAsset(searchedEntity, { r, g, b });
        }
        if (editableEntities[i].texture && editableEntities[i].tiling) {
          const { name, textureUrl, textureRotation } =
            editableEntities[i].texture;
          this.updateTextureAsset(
            name,
            textureUrl,
            textureRotation,
            searchedEntity,
            editableEntities[i].tiling
          );
        } else if (editableEntities[i].texture) {
          const { name, textureUrl, textureRotation } =
            editableEntities[i].texture;
          this.updateTextureAsset(
            name,
            textureUrl,
            textureRotation,
            searchedEntity
          );
        }
      }
    })
    .catch((error) => {
      console.error(error);
    });
};

UpdateColorAndTexture.prototype.updateTextureAsset = function (
  name,
  textureUrl,
  textureRotation,
  entity,
  tiling
) {
  if (this.width > 1000) {
    var asset = new pc.Asset(name, "texture", {
      url: textureUrl?.replace(
        "https://zord-storage-bucket.s3.amazonaws.com",
        "https://d2btao7ncfyde3.cloudfront.net"
      ),
    });
    this.app.assets.add(asset);
    const myAsset = this.app.assets.find(name);
    myAsset.ready(function (asset) {
      const meshInstances = entity?.render?._meshInstances;
      if (!meshInstances) return;
      for (let j = 0; j < meshInstances.length; j++) {
        const material = meshInstances[j]._material;
        if (material && material.name.toLowerCase() !== "glass") {
          material.diffuseMap = asset.resource;
          if (tiling) material.diffuseMapTiling = tiling;
          if (textureRotation) material.diffuseMapRotation = textureRotation;
          material.update();
        }
      }
    });
    this.app.assets.load(asset);
  } else {
    try {
      var image = new Image();
      image.crossOrigin = "anonymous"; // This is critical when loading image from a different domain
      image.onload = function () {
        var desiredWidth = 200; // Set to the desired width
        var desiredHeight = 200; // Set to the desired height

        resizeImage(
          image,
          desiredWidth,
          desiredHeight,
          function (resizedImageUrl) {
            // Create a texture asset with the resized image URL
            var asset = new pc.Asset(name, "texture", {
              url: resizedImageUrl,
            });
            this.app.assets.add(asset);
            const myAsset = this.app.assets.find(name);
            myAsset.ready(function (asset) {
              const meshInstances = entity?.render?._meshInstances;
              if (!meshInstances) return;
              for (let j = 0; j < meshInstances.length; j++) {
                const material = meshInstances[j]._material;
                if (material && material.name.toLowerCase() !== "glass") {
                  material.diffuseMap = asset.resource;
                  if (tiling) material.diffuseMapTiling = tiling;
                  if (textureRotation)
                    material.diffuseMapRotation = textureRotation;
                  material.update();
                }
              }
            });
            this.app.assets.load(asset);
          }.bind(this)
        );
      }.bind(this);
      image.onerror = function (err) {
        console.log("Error Loading Texture Image", err);
      }.bind(this);
      image.src = textureUrl?.replace(
        "https://zord-storage-bucket.s3.amazonaws.com",
        "https://d2btao7ncfyde3.cloudfront.net"
      );
    } catch (err) {
      console.log("Error Loading Texture Image in catch", err.message);
    }
  }

  //new implementation
  // try {
  //   var image = new Image();
  //   image.crossOrigin = "anonymous"; // This is critical when loading image from a different domain
  //   image.onload = function () {

  //     console.log("textImage", image)
  //     var texture = new pc.Texture(this.app.graphicsDevice, {
  //       magFilter: pc.FILTER_LINEAR,
  //       minFilter: pc.FILTER_LINEAR,
  //     });
  //     texture.name = name;
  //     texture.setSource(image);
  //     const meshInstances = entity?.render?._meshInstances;
  //     if (!meshInstances) return;
  //     for (let j = 0; j < meshInstances.length; j++) {
  //       const material = meshInstances[j]._material;
  //       if (material && material.name.toLowerCase() !== "glass") {
  //         material.diffuseMap = texture; // Set the diffuse map to the new texture
  //         if (tiling) material.diffuseMapTiling = tiling;
  //         if (textureRotation) material.diffuseMapRotation = textureRotation;
  //         material.update(); // Update the material to apply changes
  //       }
  //     }
  //   }.bind(this);
  //   image.onerror = function (err) {
  //     console.log("Error Loading Texture Image", err);
  //   }.bind(this);
  //   image.src = textureUrl?.replace(
  //       "https://zord-storage-bucket.s3.amazonaws.com",
  //       "https://d2btao7ncfyde3.cloudfront.net"
  //     )
  //   // image.style.objectFit = "cover";
  //   // image.width = width;
  //   // image.height = height;
  // } catch (err) {
  //   console.log("Error Loading Texture Image in catch", err.message);
  // }
};

UpdateColorAndTexture.prototype.updateTiling = function (entity, tiling) {
  const meshInstances = entity?.render?._meshInstances;
  if (!meshInstances) return;
  for (let j = 0; j < meshInstances.length; j++) {
    const material = meshInstances[j]._material;
    if (material && material.name.toLowerCase() !== "glass") {
      material.diffuseMapTiling = tiling;
      material.update();
    }
  }
};

UpdateColorAndTexture.prototype.updateColorAsset = function (entity, color) {
  const { r, g, b } = color;
  const meshInstances = entity?.render?._meshInstances;
  if (!meshInstances) return;
  for (let j = 0; j < meshInstances.length; j++) {
    const material = meshInstances[j]._material;
    if (material && material.name.toLowerCase() !== "glass") {
      material._diffuseTint = true;
      material.diffuse.set(r, g, b);
      material.update();
    }
  }
};

UpdateColorAndTexture.prototype.handleEditThemeFlag = function (bool) {
  editThemeFlag = bool;
};

UpdateColorAndTexture.prototype.handleResetInteriorStudio = function () {
  // if (!isAdmin || packageId === "free") return;

  for (let i = 0; i < editableEntities.length; i++) {
    editableEntities[i].texture = null;
    editableEntities[i].tiling = null;
    editableEntities[i].color = null;
    const searchedEntity = this.app.root.findByName(editableEntities[i].name);
    if (!searchedEntity) return;
    const meshInstances = searchedEntity?.render?._meshInstances;
    if (!meshInstances) return;
    for (let j = 0; j < meshInstances.length; j++) {
      const material = meshInstances[j]._material;
      material.diffuseMapTiling = { x: 1, y: 1 };
      material.diffuseMap = null;
      material.diffuse.set(1, 1, 1);
      material.update();
    }
  }

  // Api call to save settings

  const body = { settings: editableEntities };
  console.log("editaa", editableEntities);

  axios
    .post(`${ApiUrl}update-store-setting/${shopId}/${experienceId}`, body)
    .then((response) => {
      customToast("Theme Updated Successfully");
      this.app.fire("updatedChanges");
      // if (this.texturesToDelete.length > 0)
      //   this.texturesToDelete.map((texName) => deleteFromAWS(texName));
    })
    .catch((error) => {
      console.error(error);
      customToast("Oops! Something went wrong", false);
    });
};

// update code called every frame
UpdateColorAndTexture.prototype.update = function () {};

// Function to resize the image
function resizeImage(image, width, height, callback) {
  var canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);

  canvas.toBlob(function (blob) {
    var resizedImageUrl = URL.createObjectURL(blob);
    callback(resizedImageUrl);
  }, "image/png");
}

function createIndicator(entity) {
  var indicator = entity.clone(true);

  var newMaterial = new pc.StandardMaterial();
  newMaterial.blendType = pc.BLEND_NORMAL;
  newMaterial.opacity = 0.3;
  newMaterial.diffuse.set(1, 0, 0);

  const meshInstances = indicator?.render?._meshInstances;
  if (!meshInstances) return;
  for (let i = 0; i < meshInstances.length; i++) {
    meshInstances[i]._material = newMaterial;
    meshInstances[i]._material.update();
  }

  var posLocal = entity.getLocalPosition();
  var rotLocal = entity.getLocalRotation();

  indicator.setLocalPosition(posLocal);
  indicator.setLocalRotation(rotLocal);

  if (entity.parent) {
    entity.parent.addChild(indicator);
  } else {
    entity.addChild(indicator);
  }

  // selector = indicator;
}
