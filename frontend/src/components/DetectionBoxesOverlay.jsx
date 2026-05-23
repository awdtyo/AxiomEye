import React from "react";
import { motion } from "framer-motion";

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function findHotspots(matrix, { threshold = 0.75, maxBoxes = 4 } = {}) {
  if (!Array.isArray(matrix) || !Array.isArray(matrix[0])) return [];
  const h = matrix.length;
  const w = matrix[0].length;
  if (!h || !w) return [];

  const points = [];
  for (let y = 0; y < h; y++) {
    const row = matrix[y];
    for (let x = 0; x < w; x++) {
      const v = clamp01(Number(row[x]));
      if (v >= threshold) points.push({ x, y, v });
    }
  }
  if (!points.length) return [];

  // Sort by highest intensity
  points.sort((a, b) => b.v - a.v);
  const picked = [];
  const minDist = Math.max(8, Math.floor(Math.min(w, h) * 0.12));

  for (const p of points) {
    if (picked.length >= maxBoxes) break;
    if (picked.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < minDist)) {
      continue;
    }
    picked.push(p);
  }

  return picked.map((p, idx) => {
    const size = Math.max(0.16, Math.min(0.32, 0.18 + (p.v - threshold) * 0.4));
    const nx = p.x / Math.max(1, w - 1);
    const ny = p.y / Math.max(1, h - 1);
    const hw = size * 0.5;
    const hh = size * 0.5;
    const x0 = clamp01(nx - hw);
    const y0 = clamp01(ny - hh);
    const x1 = clamp01(nx + hw);
    const y1 = clamp01(ny + hh);
    const conf = clamp01(0.68 + (p.v - threshold) * 0.8);

    return {
      id: `box_${idx}`,
      x: x0,
      y: y0,
      w: Math.max(0.08, x1 - x0),
      h: Math.max(0.08, y1 - y0),
      conf,
      score: p.v
    };
  });
}

export default function DetectionBoxesOverlay({
  matrix,
  verdict = "suspicious",
  active,
  imageWidth,
  imageHeight
}) {
  const boxes = React.useMemo(
    () => findHotspots(matrix, { threshold: 0.78, maxBoxes: 4 }),
    [matrix]
  );

  if (!active || !boxes.length) return null;

  // Determine styling color
  const color =
    verdict === "authentic"
      ? "emerald"
      : verdict === "manipulated"
        ? "rose"
        : "amber";

  // Visual classes mapped
  const borderCol =
    color === "emerald"
      ? "border-emerald-500/80 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
      : color === "rose"
        ? "border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.4)]"
        : "border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]";

  const cornerCol =
    color === "emerald"
      ? "bg-emerald-400"
      : color === "rose"
        ? "bg-rose-400"
        : "bg-amber-300";

  const tagBg =
    color === "emerald"
      ? "bg-emerald-950/85 text-emerald-300 border-emerald-500/40"
      : color === "rose"
        ? "bg-rose-950/85 text-rose-300 border-rose-500/40"
        : "bg-amber-950/85 text-amber-300 border-amber-500/40";

  const displayCategory =
    verdict === "authentic"
      ? "Real Photograph"
      : verdict === "manipulated"
        ? "Edited/Manipulated"
        : "Suspicious Artifact";

  const scaleX = Number.isFinite(imageWidth) ? imageWidth : 1;
  const scaleY = Number.isFinite(imageHeight) ? imageHeight : 1;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-xl">
      {boxes.map((b, i) => {
        const left = b.x * scaleX;
        const top = b.y * scaleY;
        const width = b.w * scaleX;
        const height = b.h * scaleY;
        const pct = Math.round(b.conf * 100);

        return (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={["absolute border", borderCol].join(" ")}
            style={{ left, top, width, height }}
          >
            {/* Cyber Brackets (Corner Ticks) */}
            <div className={`absolute -top-[1.5px] -left-[1.5px] w-3 h-3 border-t-2 border-l-2 ${color === "emerald" ? "border-emerald-400" : color === "rose" ? "border-rose-400" : "border-amber-300"}`} />
            <div className={`absolute -top-[1.5px] -right-[1.5px] w-3 h-3 border-t-2 border-r-2 ${color === "emerald" ? "border-emerald-400" : color === "rose" ? "border-rose-400" : "border-amber-300"}`} />
            <div className={`absolute -bottom-[1.5px] -left-[1.5px] w-3 h-3 border-b-2 border-l-2 ${color === "emerald" ? "border-emerald-400" : color === "rose" ? "border-rose-400" : "border-amber-300"}`} />
            <div className={`absolute -bottom-[1.5px] -right-[1.5px] w-3 h-3 border-b-2 border-r-2 ${color === "emerald" ? "border-emerald-400" : color === "rose" ? "border-rose-400" : "border-amber-300"}`} />

            {/* Glowing Scan Line Sweep Inside Bounding Box */}
            <motion.div
              className="absolute left-0 w-full h-[1px] opacity-35 bg-white"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                boxShadow:
                  color === "emerald"
                    ? "0 0 8px #10b981"
                    : color === "rose"
                      ? "0 0 10px #f43f5e"
                      : "0 0 8px #f59e0b"
              }}
            />

            {/* Premium Indicator Badge */}
            <div className="absolute -top-7 left-2">
              <div className={["inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md", tagBg].join(" ")}>
                <span className={`h-1.5 w-1.5 rounded-full ${cornerCol} animate-pulse`} />
                <span>ZONE #{i + 1}</span>
                <span className="opacity-40">|</span>
                <span className="text-white">{pct}%</span>
                <span className="opacity-40">|</span>
                <span>{displayCategory}</span>
              </div>
            </div>

            {/* Inward pulse blur */}
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: [0.1, 0.22, 0.1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                background:
                  color === "emerald"
                    ? "radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 80%)"
                    : color === "rose"
                      ? "radial-gradient(circle, rgba(244,63,94,0.2) 0%, transparent 80%)"
                      : "radial-gradient(circle, rgba(252,211,77,0.15) 0%, transparent 80%)"
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
