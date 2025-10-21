import React, { useEffect, useRef } from "react";
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
//const mainGlb = "./3dModels/GLB 4(1).glb";
const mainGlb = "./3dModels/arab environment.glb";
const BaseModel = "./Avatar assets/Base Model.glb";
const BlueJacket = "./Avatar assets/Blue Jacket.glb";
const Antenna = "./Avatar assets/Antena 01.glb";
const Headphone = "./Avatar assets/Headphone.glb";

const Engine = () => {
  const appRef = useRef(null);
  const characterRootRef = useRef(null);
  const assetEntitiesRef = useRef({}); // to track added entities (jacket, antenna, headphone)

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
              entity.addComponent("rigidbody", { type: "static" });
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
          characterRoot.setLocalEulerAngles(0, 0, 0);

          // Character physics — only declared here (clean, centralized)
          characterRoot.addComponent("rigidbody", {
            type: "kinematic",
            mass: 1,
            linearDamping: 0.5,
            angularDamping: 1,
          });

          // Use a capsule collider for the player (better for movement than a mesh collider)
          characterRoot.addComponent("collision", {
            type: "capsule",
            radius: 0.28,
            height: 1.1,
          });

          characterRoot.addComponent("script");
          characterRoot.script.create("playerMovement", {
            attributes: { speed: 0.09 },
          });

          // Base Modela
          const baseModelEntity =
            baseModelAsset.resource.instantiateRenderEntity();
          baseModelEntity.name = "BaseModel";

          // Ensure each render sub-entity has a mesh collision + static rigidbody
          baseModelEntity.findComponents("render").forEach((render) => {
            const entity = render.entity;
            if (!entity.collision) {
              entity.addComponent("collision", {
                type: "mesh",
                renderAsset: render.asset,
              });
            }
            if (!entity.rigidbody) {
              entity.addComponent("rigidbody", { type: "static" });
            }
          });

          characterRoot.addChild(baseModelEntity);

          // Camera Origin
          const cameraOrigin = new pc.Entity("CameraOrigin");
          cameraOrigin.setLocalPosition(0, 2, 0);
          characterRoot.addChild(cameraOrigin);

          // Camera Entity
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

          console.log("CharacterRoot Entity:", characterRoot);
          window.characterRoot = characterRoot;
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

        // Helper to add accessory
        const addAccessory = (asset, name) => {
          const root = characterRootRef.current;
          if (!root || !asset.resource) return;
          if (assetEntitiesRef.current[name]) {
            console.log(`${name} already added.`);
            return;
          }
          const entity = asset.resource.instantiateRenderEntity();
          entity.name = name;
          root.addChild(entity);
          assetEntitiesRef.current[name] = entity;
          console.log(`${name} added to CharacterRoot.`);
        };

        // Expose for UI
        window.addAccessory = addAccessory;
        window.assets = {
          Jacket: jacketAsset,
          Antenna: antennaAsset,
          Headphone: headphoneAsset,
        };

        // list all camera components and their entity names
        const cams = app.root.findComponents("camera");
        console.log(
          "Cameras found:",
          cams.length,
          cams.map((c) => c.entity.name)
        );

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

  // UI button handlers
  const handleAddJacket = () =>
    window.addAccessory(window.assets.Jacket, "Jacket");
  const handleAddAntenna = () =>
    window.addAccessory(window.assets.Antenna, "Antenna");
  const handleAddHeadphone = () =>
    window.addAccessory(window.assets.Headphone, "Headphone");

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ position: "relative", width: "100vw", height: "100vh" }}
    >
      {/* Right Side Panel */}
      <div className="absolute top-0 right-0 h-full w-64 bg-gray-800 bg-opacity-80 backdrop-blur text-white p-4 space-y-6 z-50 shadow-lg">
        {/* Section 1: Fashion */}
        <div>
          <h2 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">
            Fashion
          </h2>
          <div className="space-y-2">
            <button
              onClick={handleAddJacket}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
            >
              Jacket
            </button>
            <button
              onClick={handleAddAntenna}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
            >
              Antenna
            </button>
            <button
              onClick={handleAddHeadphone}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
            >
              Headphone
            </button>
          </div>
        </div>

        {/* Section 2: Change Color */}
        <div>
          <h2 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">
            Change Color
          </h2>
          <button className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">
            Gray
          </button>
        </div>

        {/* Section 3: Textures */}
        <div>
          <h2 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">
            Textures
          </h2>
          <button className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">
            Default
          </button>
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
