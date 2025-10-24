import React, { useEffect, useRef, useState } from "react";
import * as pc from "playcanvas";
import { FpsPlaycanvas } from "../../../public/scripts/myFPSscript.js";
import { SetSkybox } from "../../../public/scripts/set-skybox.js";
import {
  InitAmmo,
  LoadDracoDecoder,
} from "../../../public/scripts/ammo-draco-loader.js";
import { registerRaycastScript } from "./raycast.jsx";
import { registerPlayerMovementScript } from "../scripts/PlayerMovement.jsx";
import { registerCameraMovementScript } from "../scripts/CameraMovement.jsx";

// Assets
const mainGlb = "./3dModels/arab environment.glb";
const BaseModel = "./Avatar assets/Base Model.glb";
const BlueJacket = "./Avatar assets/Blue Jacket.glb";
const Antenna = "./Avatar assets/Antena 01.glb";
const Headphone = "./Avatar assets/Headphone.glb";

const DEFAULT_EMISSIVE_COLOR = "#808080"; // gray color

const Engine = () => {
  const appRef = useRef(null);
  const characterRootRef = useRef(null);
  const assetEntitiesRef = useRef({});
  const [colorValue, setColorValue] = useState(DEFAULT_EMISSIVE_COLOR);
  const fileInputRef = useRef(null);
  const accessoryMaterialsRef = useRef({});
  const [loadedAccessories, setLoadedAccessories] = useState({
    Jacket: false,
    Antenna: false,
    Headphone: false,
  });
  const [accessoryColors, setAccessoryColors] = useState({
    Jacket: "#ffffff",
    Antenna: "#ffffff",
    Headphone: "#ffffff",
  });

  useEffect(() => {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      if (appRef.current) {
        appRef.current.resizeCanvas(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    let destroyed = false;

    async function initializeGame() {
      try {
        handleResize();
        const gfxOptions = {
          deviceTypes: [pc.DEVICETYPE_WEBGL2],
          glslangUrl: "/public/lib/glslang/glslang.js",
          twgslUrl: "/public/lib/twgsl/twgsl.js",
        };
        await InitAmmo();
        await LoadDracoDecoder(pc);

        const device = await pc.createGraphicsDevice(canvas, gfxOptions);
        const createOptions = new pc.AppOptions();
        createOptions.graphicsDevice = device;
        createOptions.keyboard = new pc.Keyboard(document.body);
        createOptions.mouse = new pc.Mouse(canvas);
        createOptions.elementInput = new pc.ElementInput(canvas);
        createOptions.componentSystems = [
          pc.RenderComponentSystem,
          pc.CameraComponentSystem,
          pc.LightComponentSystem,
          pc.ScriptComponentSystem,
          pc.CollisionComponentSystem,
          pc.RigidBodyComponentSystem,
          pc.ElementComponentSystem,
          pc.AnimComponentSystem,
        ];
        createOptions.resourceHandlers = [
          pc.TextureHandler,
          pc.ContainerHandler,
          pc.ScriptHandler,
          pc.JsonHandler,
          pc.FontHandler,
        ];

        const app = new pc.Application(canvas, createOptions);
        appRef.current = app;
        app.start();

        app.systems.add("rigidbody", { gravity: new pc.Vec3(0, -9.81, 0) });

        const outlineRenderer = new pc.OutlineRenderer(app);
        app.outlineRenderer = outlineRenderer;

        app.on("update", () => {
          const camera = app.root.findByName("Camera");
          const layers = app.scene.layers.layerList;
          const immediateLayer = layers.find((l) => l.name === "Immediate");
          if (camera && immediateLayer && app.outlineRenderer) {
            app.outlineRenderer.frameUpdate(camera, immediateLayer, false);
          }
        });

        // Register scripts
        FpsPlaycanvas(pc, canvas);
        SetSkybox(pc, app);
        registerPlayerMovementScript(pc);
        registerCameraMovementScript(pc);
        registerRaycastScript(pc);

        // LIGHT
        const light = new pc.Entity();
        light.addComponent("light", {
          type: "directional",
          intensity: 0.7,
          castShadows: true,
        });
        light.setEulerAngles(45, 30, 0);
        app.root.addChild(light);

        // Load main environment model
        const storeAsset = new pc.Asset("Store", "container", { url: mainGlb });
        storeAsset.once("load", () => {
          const container = storeAsset.resource;
          const modelEntity = container.instantiateRenderEntity();

          modelEntity.findComponents("render").forEach((render) => {
            const entity = render.entity;
            if (!entity.collision)
              entity.addComponent("collision", {
                type: "mesh",
                renderAsset: render.asset,
              });
            if (!entity.rigidbody)
              entity.addComponent("rigidbody", { type: "inematic" });
          });

          app.root.addChild(modelEntity);
        });
        app.assets.add(storeAsset);
        app.assets.load(storeAsset);

        // === CHARACTER ROOT ===
        const baseModelAsset = new pc.Asset("PlayerModel", "container", {
          url: BaseModel,
        });
        app.assets.add(baseModelAsset);
        baseModelAsset.once("load", () => {
          const characterRoot = new pc.Entity("CharacterRoot");
          characterRoot.setLocalPosition(2, 0.5, 8);

          characterRoot.addComponent("rigidbody", {
            type: "kinematic",
            mass: 1,
            linearDamping: 0.5,
            angularDamping: 1,
          });
          characterRoot.addComponent("collision", {
            type: "capsule",
            radius: 0.28,
            height: 1.1,
          });
          characterRoot.addComponent("script");
          characterRoot.script.create("playerMovement", {
            attributes: { speed: 0.09 },
          });

          // Base Model
          const baseModelEntity =
            baseModelAsset.resource.instantiateRenderEntity();
          baseModelEntity.name = "BaseModel";
          characterRoot.addChild(baseModelEntity);

          const baseRobotEntity = baseModelEntity.findByName("Base Robot");
          if (baseRobotEntity && baseRobotEntity.render) {
            baseRobotEntity.render.meshInstances.forEach((mi) => {
              const mat = mi.material;

              if (mat && mat.name === "model.013") {
                mat.emissive.set(0.5, 0.5, 0.5);
                mat.emissiveIntensity = 50;
                mat.update();
                window.model013Material = mat;
              }

              // Create and assign material for "alpha"
              if (mat && mat.name === "alpha") {
                // Create a new standard material
                const alphaMaterial = new pc.StandardMaterial();
                alphaMaterial.name = "alpha";

                // Configure material properties
                alphaMaterial.diffuse.set(1, 1, 1); // White base color
                alphaMaterial.shininess = 100;
                alphaMaterial.useMetalness = true;
                alphaMaterial.metalness = 0.0;
                alphaMaterial.gloss = 5;

                // Enable the material
                alphaMaterial.update();

                // Assign the material to the mesh instance
                mi.material = alphaMaterial;
                mi.visible = true;

                // Store reference for texture upload
                window.alphaMaterial = alphaMaterial;
                console.log(
                  "Alpha material created and assigned.",
                  alphaMaterial
                );
              }
            });
          } else {
            console.warn(
              "Could not find 'Base Robot' or no render component found"
            );
          }

          // Camera Origin + Camera
          const cameraOrigin = new pc.Entity("CameraOrigin");
          cameraOrigin.setLocalPosition(0, 2, 0);
          characterRoot.addChild(cameraOrigin);

          const camEntity = new pc.Entity("Camera");
          camEntity.addComponent("camera", { farClip: 50, fov: 60 });
          camEntity.addComponent("script");
          camEntity.script.create("cameraMovement", {
            attributes: { mouseSpeed: 1.4 },
          });
          cameraOrigin.addChild(camEntity);

          // Raycast
          const rayEnd = new pc.Entity("RaycastEndPoint");
          rayEnd.setLocalPosition(0, 0, -5);
          cameraOrigin.addChild(rayEnd);

          const raycastEntity = new pc.Entity("RaycastEntity");
          raycastEntity.addComponent("script");
          raycastEntity.script.create("raycast", {
            attributes: { camera: camEntity },
          });
          app.root.addChild(raycastEntity);

          app.root.addChild(characterRoot);
          characterRootRef.current = characterRoot;
        });
        app.assets.load(baseModelAsset);

        // Preload accessory assets
        const jacketAsset = new pc.Asset("Jacket", "container", {
          url: BlueJacket,
        });
        const antennaAsset = new pc.Asset("Antenna", "container", {
          url: Antenna,
        });
        const headphoneAsset = new pc.Asset("Headphone", "container", {
          url: Headphone,
        });
        app.assets.add(jacketAsset);
        app.assets.add(antennaAsset);
        app.assets.add(headphoneAsset);
        app.assets.load(jacketAsset);
        app.assets.load(antennaAsset);
        app.assets.load(headphoneAsset);

        // Add accessory helper
        const addAccessory = (asset, name) => {
          const root = characterRootRef.current;
          if (!root || !asset.resource) return;
          if (assetEntitiesRef.current[name]) return;
          const entity = asset.resource.instantiateRenderEntity();
          entity.name = name;
          root.addChild(entity);
          assetEntitiesRef.current[name] = entity;

          // Store material references for color changing
          const materials = [];
          entity.findComponents("render").forEach((render) => {
            render.meshInstances.forEach((mi) => {
              if (mi.material) {
                // Initialize material with white color
                mi.material.diffuse.set(1, 1, 1);
                mi.material.update();
                materials.push(mi.material);
              }
            });
          });
          accessoryMaterialsRef.current[name] = materials;
        };

        // Remove accessory helper
        const removeAccessory = (name) => {
          const entity = assetEntitiesRef.current[name];
          if (entity) {
            entity.destroy();
            delete assetEntitiesRef.current[name];
            delete accessoryMaterialsRef.current[name];
          }
        };

        // Expose for UI
        window.addAccessory = addAccessory;
        window.removeAccessory = removeAccessory;
        window.assets = {
          Jacket: jacketAsset,
          Antenna: antennaAsset,
          Headphone: headphoneAsset,
        };

        app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
        app.setCanvasResolution(pc.RESOLUTION_AUTO);
      } catch (err) {
        if (!destroyed)
          console.error("Error initializing PlayCanvas game:", err);
      }
    }

    initializeGame();

    return () => {
      destroyed = true;
      window.removeEventListener("resize", handleResize);
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
      const ammoScript = document.querySelector('script[src*="ammo.wasm.js"]');
      if (ammoScript) ammoScript.remove();
    };
  }, []);

  //  UI Handlers
  const handleAddAccessory = (asset, name) => {
    window.addAccessory(asset, name);
    setLoadedAccessories((prev) => ({ ...prev, [name]: true }));
  };

  const handleRemoveAccessory = (name) => {
    window.removeAccessory(name);
    setLoadedAccessories((prev) => ({ ...prev, [name]: false }));
  };

  const handleColorChange = (e) => {
    const hex = e.target.value;
    setColorValue(hex);
    const r = parseInt(hex.substr(1, 2), 16) / 255;
    const g = parseInt(hex.substr(3, 2), 16) / 255;
    const b = parseInt(hex.substr(5, 2), 16) / 255;
    if (window.model013Material) {
      window.model013Material.emissive.set(r, g, b);
      window.model013Material.update();
    }
  };

  const handleResetColor = () => {
    setColorValue(DEFAULT_EMISSIVE_COLOR);
    if (window.model013Material) {
      window.model013Material.emissive.set(0.5, 0.5, 0.5);
      window.model013Material.update();
    }
  };

  const handleTextureUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (!appRef.current || !window.alphaMaterial) {
          console.warn("App or alpha material not available");
          return;
        }

        const texture = new pc.Texture(appRef.current.graphicsDevice, {
          width: img.width,
          height: img.height,
          format: pc.PIXELFORMAT_RGBA8,
          mipmaps: true,
        });

        texture.setSource(img);
        texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
        texture.magFilter = pc.FILTER_LINEAR;
        texture.addressU = pc.ADDRESS_REPEAT;
        texture.addressV = pc.ADDRESS_REPEAT;

        window.alphaMaterial.diffuseMap = texture;
        window.alphaMaterial.update();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Reset input to allow re-uploading the same file
    event.target.value = "";
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAccessoryColorChange = (name, hexColor) => {
    setAccessoryColors((prev) => ({ ...prev, [name]: hexColor }));

    const materials = accessoryMaterialsRef.current[name];
    if (!materials || materials.length === 0) return;

    const r = parseInt(hexColor.substr(1, 2), 16) / 255;
    const g = parseInt(hexColor.substr(3, 2), 16) / 255;
    const b = parseInt(hexColor.substr(5, 2), 16) / 255;

    materials.forEach((mat) => {
      mat.diffuse.set(r, g, b);
      mat.update();
    });
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ position: "relative", width: "100vw", height: "100vh" }}
    >
      <div className="absolute top-0 right-0 h-full w-80 bg-black bg-opacity-40 backdrop-blur-md text-white z-50">
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="border-b border-white border-opacity-20 pb-3">
            <h1 className="text-2xl font-light tracking-wide">Wardrobe</h1>
          </div>

          {/* Accessories Section */}
          <div>
            <h2 className="text-sm font-light tracking-wider text-gray-300 mb-4 uppercase">
              Accessories
            </h2>
            <div className="space-y-3">
              {["Jacket", "Antenna", "Headphone"].map((item) => (
                <div key={item} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handleAddAccessory(window.assets[item], item)
                      }
                      className={`flex-1 px-4 py-2.5 text-left border transition-all ${
                        loadedAccessories[item]
                          ? "border-white border-opacity-40 bg-white bg-opacity-10"
                          : "border-white border-opacity-20 hover:border-opacity-40"
                      }`}
                    >
                      <span className="font-light">{item}</span>
                    </button>
                    {loadedAccessories[item] && (
                      <>
                        <input
                          type="color"
                          value={accessoryColors[item]}
                          onChange={(e) =>
                            handleAccessoryColorChange(item, e.target.value)
                          }
                          className="w-10 h-10 cursor-pointer bg-transparent border border-white border-opacity-20"
                          title="Change color"
                        />
                        <button
                          onClick={() => handleRemoveAccessory(item)}
                          className="w-10 h-10 border border-white border-opacity-20 hover:border-opacity-40 hover:bg-white hover:bg-opacity-10 transition-all"
                          title={`Remove ${item}`}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emissive Color Section */}
          <div>
            <h2 className="text-sm font-light tracking-wider text-gray-300 mb-4 uppercase">
              Glow Color
            </h2>
            <div className="flex gap-3">
              <input
                type="color"
                value={colorValue}
                className="flex-1 h-12 cursor-pointer bg-transparent border border-white border-opacity-20"
                onChange={handleColorChange}
              />
              <button
                onClick={handleResetColor}
                className="px-5 border border-white border-opacity-20 hover:border-opacity-40 hover:bg-white hover:bg-opacity-10 transition-all font-light"
                title="Reset color"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Texture Upload Section */}
          <div>
            <h2 className="text-sm font-light tracking-wider text-gray-300 mb-4 uppercase">
              Custom Texture
            </h2>
            <button
              onClick={handleUploadClick}
              className="w-full px-4 py-3 border border-white border-opacity-20 hover:border-opacity-40 hover:bg-white hover:bg-opacity-10 transition-all font-light"
            >
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleTextureUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="z-10">
        <canvas
          id="gameCanvas"
          className="absolute inset-0 w-full h-full touch-none"
        />
      </div>
    </div>
  );
};

export default Engine;
