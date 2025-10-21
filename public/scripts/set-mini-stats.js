export function MiniStats(pc, app) {
  // Set up mini-stats
  const options = pc.MiniStats.getDefaultOptions();
  options.sizes = [
    { width: 128, height: 12, spacing: 0, graphs: false },
    { width: 256, height: 12, spacing: 2, graphs: true },
    { width: 256, height: 16, spacing: 2, graphs: true },
  ];
  options.startSizeIndex = 0;

  options.stats = [
    { name: "DrawCalls", stats: ["drawCalls.total"], watermark: 2000 },
    {
      name: "VRAM",
      stats: ["vram.tex", "vram.geom"],
      decimalPlaces: 1,
      multiplier: 1 / (1024 * 1024),
      unitsName: "MB",
      watermark: 100,
    },
    { name: "FPS", stats: ["frame.fps"], watermark: 60 },
    {
      name: "Frame",
      stats: ["frame.ms"],
      decimalPlaces: 1,
      unitsName: "ms",
      watermark: 33,
    },
  ];

  const miniStats = new pc.MiniStats(app, options);
}
