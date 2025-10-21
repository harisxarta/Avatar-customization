const InitAmmo = () => {
  return new Promise((resolve) => {
    if (typeof Ammo === "function") {
      Ammo().then((AmmoLib) => {
        resolve(AmmoLib);
      });
    } else {
      const script = document.createElement("script");
      script.src = "/lib/ammo/ammo.wasm.js"; // Update path to match your public directory
      script.async = true;
      script.onload = () => {
        Ammo().then((AmmoLib) => {
          window.Ammo = AmmoLib; // Important: store Ammo in window object
          resolve(AmmoLib);
        });
      };
      document.body.appendChild(script);
    }
  });
};

// Load Draco.js using the correct method��
const LoadDracoDecoder = async (pc) => {
  // Set the configuration for Draco decoder
  pc.WasmModule.setConfig("DracoDecoderModule", {
    glueUrl: "/lib/draco/draco.wasm.js",
    wasmUrl: "/lib/draco/draco.wasm.wasm",
    fallbackUrl: "/lib/draco/draco.js",
  });

  // Wait until the Draco decoder is ready
  await new Promise((resolve) => {
    pc.WasmModule.getInstance("DracoDecoderModule", () => resolve());
  });
};

export { InitAmmo, LoadDracoDecoder };
