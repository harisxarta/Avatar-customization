export function SetSkybox(pc, app) {
  // Create and load skybox texture
  const skyboxAsset = new pc.Asset("skybox", "cubemap", {
    url: "public/skyboxes/skybox.dds", // Your skybox texture path
    mipmaps: false,
  });

  // Handle skybox loading and application
  skyboxAsset.on("load", function () {
    // Create the skybox
    //app.scene.skyboxMip = 0;
    //app.scene.skyboxIntensity = 1.0; // Adjust intensity as needed
    app.scene.setSkybox(skyboxAsset.resources);

    // Enable skybox rendering
    app.scene.gammaCorrection = pc.GAMMA_SRGB;
    app.scene.toneMapping = pc.TONEMAP_ACES;
    app.scene.skyboxRotation = new pc.Quat(); // You can rotate the skybox if needed
  });

  // Add the asset to the asset registry and load it
  app.assets.add(skyboxAsset);
  app.assets.load(skyboxAsset);
  //   return skyboxAsset;
}
