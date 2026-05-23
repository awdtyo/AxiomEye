import React from "react";

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function downsampleMatrix(matrix, maxW, maxH) {
  const h = matrix.length;
  const w = matrix[0]?.length || 0;
  if (!h || !w) return matrix;
  const sx = Math.max(1, Math.ceil(w / maxW));
  const sy = Math.max(1, Math.ceil(h / maxH));
  if (sx === 1 && sy === 1) return matrix;

  const outH = Math.ceil(h / sy);
  const outW = Math.ceil(w / sx);
  const out = Array.from({ length: outH }, () => Array.from({ length: outW }, () => 0));

  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      let sum = 0;
      let n = 0;
      const y0 = oy * sy;
      const x0 = ox * sx;
      for (let y = y0; y < Math.min(h, y0 + sy); y++) {
        const row = matrix[y];
        for (let x = x0; x < Math.min(w, x0 + sx); x++) {
          sum += clamp01(row[x]);
          n += 1;
        }
      }
      out[oy][ox] = n ? sum / n : 0;
    }
  }

  return out;
}

export default function HeatmapOverlay({ matrix, active, width, height }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = Math.max(1, Math.floor(width || 1));
    const h = Math.max(1, Math.floor(height || 1));
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    if (!active || !Array.isArray(matrix) || !matrix.length) return;

    const m = downsampleMatrix(matrix, 160, 160);
    const mh = m.length;
    const mw = m[0]?.length || 0;
    if (!mh || !mw) return;

    const mini = document.createElement("canvas");
    mini.width = mw;
    mini.height = mh;
    const mctx = mini.getContext("2d");
    if (!mctx) return;

    const img = mctx.createImageData(mw, mh);
    for (let y = 0; y < mh; y++) {
      const row = m[y];
      for (let x = 0; x < mw; x++) {
        const v = clamp01(row[x]);
        const i = (y * mw + x) * 4;

        // Custom Cyberpunk Heat Gradient Mapping
        // Lower levels blend into cyan/purple, higher values map to vivid fuchsia/red
        if (v > 0.75) {
          img.data[i] = 244;     // Red
          img.data[i + 1] = 63;  // Green
          img.data[i + 2] = 94;  // Blue
        } else if (v > 0.4) {
          img.data[i] = 168;     // Fuchsia/Purple
          img.data[i + 1] = 85;
          img.data[i + 2] = 247;
        } else {
          img.data[i] = 6;       // Cyan
          img.data[i + 1] = 182;
          img.data[i + 2] = 212;
        }

        // Apply visual exponent scaling for contrast
        img.data[i + 3] = Math.round(235 * Math.pow(v, 0.75));
      }
    }
    mctx.putImageData(img, 0, 0);

    // Apply smooth composited glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    
    // First pass: deep soft blur glow
    ctx.filter = "blur(14px)";
    ctx.globalAlpha = 0.9;
    ctx.drawImage(mini, 0, 0, w, h);
    
    // Second pass: sharper detailed overlay
    ctx.filter = "blur(3px)";
    ctx.globalAlpha = 0.8;
    ctx.drawImage(mini, 0, 0, w, h);
    
    ctx.restore();
  }, [matrix, active, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={[
        "absolute inset-0 h-full w-full pointer-events-none transition-opacity duration-300",
        active ? "opacity-100" : "opacity-0"
      ].join(" ")}
    />
  );
}
