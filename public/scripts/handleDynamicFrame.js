var HandleDynamicFrame = pc.createScript("handleDynamicFrame");

// initialize code called once per entity
HandleDynamicFrame.prototype.initialize = function () {
  this.app.on("playMedia", this.handlePlayMedia, this);
  this.app.on("removeMedia", this.handleRemoveMedia, this);
  this.mediaTextures = {};
  this.videos = {};
};

HandleDynamicFrame.prototype.handleRemoveMedia = function (data) {
  if (!data.model.isImage && data.model.frameData) {
    this.mediaTextures[data.model.name].video.remove();
    this.mediaTextures[data.model.name].videoTexture.destroy();
    delete this.videos[data.model.name];
    delete this.mediaTextures[data.model.name];
  } else if (data.model.isImage && data.model.frameData) {
    delete this.mediaTextures[data.model.name];
  }
  var originalMaterial =
    // data.model._children[1].render.meshInstances[1].material;
    data?.model?._children[0]?.name == "Frame_Baked"
      ? data?.model?._children[0]?.render?.meshInstances[1]?.material
      : data?.model?._children[1]?.render?.meshInstances[1]?.material;
  console.log("original material is", originalMaterial);
  originalMaterial.diffuseMap = null;
  originalMaterial.update();
  console.log("media become", this.mediaTextures);
  console.log("videos become", this.videos);
};

// handlePlayMedia code to set up media texture for each entity
HandleDynamicFrame.prototype.handlePlayMedia = function (data) {
  var app = this.app;

  // Helper function to check if URL is an image
  const isImage = (url) => {
    return url.match(/\.(jpeg|jpg|gif|png|jfif)$/i) != null;
  };

  // Function to create video texture and assign it to a frame
  const createVideoTexture = (frame, videoUrl) => {
    console.log("frame is", frame);
    var video = document.createElement("video");
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.autoplay = true;

    var style = video.style;
    style.width = "1px";
    style.height = "1px";
    style.position = "absolute";
    style.opacity = "0";
    style.zIndex = "-1000";
    style.pointerEvents = "none";

    document.body.appendChild(video);

    var videoTexture = new pc.Texture(app.graphicsDevice, {
      format: pc.PIXELFORMAT_R8_G8_B8,
      minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
      magFilter: pc.FILTER_LINEAR,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE,
      mipmaps: true,
    });
    videoTexture.setSource(video);

    video.addEventListener("canplaythrough", function () {
      var originalMaterial =
        frame._children[0].name == "Frame_Baked"
          ? frame._children[0].render.meshInstances[1].material
          : frame._children[1].render.meshInstances[1].material;
      var material = originalMaterial.clone();
      frame._children[0].name == "Frame_Baked"
        ? (frame._children[0].render.meshInstances[1].material = material)
        : (frame._children[1].render.meshInstances[1].material = material);
      material.cull = pc.CULLFACE_BACK;
      material.diffuseMap = videoTexture;
      material.update();
      video.play();
    });

    video.src = videoUrl;
    video.load();

    this.on("destroy", function () {
      videoTexture.destroy();
      video.remove();
      console.log("destroyed video");
    });

    return { video, videoTexture };
  };

  // Function to create image texture and assign it to a frame
  const createImageTexture = (frame, imageUrl) => {
    var img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // Create a canvas and set its dimensions
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      // Draw a white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw the image on top of the white background
      ctx.drawImage(img, 0, 0);

      // Create a texture from the canvas
      var imageTexture = new pc.Texture(app.graphicsDevice, {
        format: pc.PIXELFORMAT_R8_G8_B8,
        minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
        magFilter: pc.FILTER_LINEAR,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE,
        mipmaps: true,
      });
      imageTexture.setSource(canvas);

      var originalMaterial =
        frame._children[0].name == "Frame_Baked"
          ? frame._children[0].render.meshInstances[1].material
          : frame._children[1].render.meshInstances[1].material;
      var material = originalMaterial.clone();
      frame._children[0].name == "Frame_Baked"
        ? (frame._children[0].render.meshInstances[1].material = material)
        : (frame._children[1].render.meshInstances[1].material = material);
      material.diffuseMap = imageTexture;
      material.update();

      // Store the texture for cleanup
      this.mediaTextures[data.name] = { imageTexture, img, canvas };
    };

    img.src = imageUrl;

    this.on("destroy", function () {
      if (this.mediaTextures[data.name]) {
        if (this.mediaTextures[data.name].imageTexture) {
          this.mediaTextures[data.name].imageTexture.destroy();
          console.log("destroyed image");
        }
        if (this.mediaTextures[data.name].canvas) {
          this.mediaTextures[data.name].canvas = null;
          console.log("destroyed canvas");
        }
      }
    });
  };

  // Ensure media textures are managed properly
  if (this.mediaTextures[data.name]) {
    if (this.mediaTextures[data.name].videoTexture) {
      this.mediaTextures[data.name].videoTexture.destroy();
      this.videos[data.name].remove();
    } else if (this.mediaTextures[data.name].imageTexture) {
      this.mediaTextures[data.name].imageTexture.destroy();
    }
  }

  // Determine if the URL is an image or video and create the appropriate texture
  if (isImage(data.mediaUrl)) {
    createImageTexture(data.model, data.mediaUrl);
  } else {
    const { video, videoTexture } = createVideoTexture(
      data.model,
      data.mediaUrl
    );
    this.mediaTextures[data.name] = { videoTexture, video };
    this.videos[data.name] = video;
  }
};

// update code to update the media textures
HandleDynamicFrame.prototype.update = function (dt) {
  for (var key in this.mediaTextures) {
    if (this.mediaTextures[key] && this.mediaTextures[key].videoTexture) {
      this.mediaTextures[key].videoTexture.upload();
    }
  }
};
