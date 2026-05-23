import React from "react";
import { motion } from "framer-motion";

function Step({ label, active, done, index }) {
  return (
    <motion.div 
      className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-black/20"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      {/* Node indicator */}
      <div className="relative">
        <div
          className={[
            "h-3 w-3 rounded-full transition-all duration-300",
            done ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" : "",
            !done && active
              ? "bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.9)] animate-pulse"
              : "",
            !done && !active ? "bg-zinc-700" : ""
          ].join(" ")}
        />
        {!done && active && (
          <span className="absolute -inset-1.5 rounded-full border border-cyan-400/40 animate-ping opacity-60 pointer-events-none" />
        )}
      </div>

      {/* Label and description */}
      <div className="flex-1 min-w-0">
        <div className={[
          "text-sm font-semibold tracking-wide transition-colors duration-300",
          done ? "text-zinc-300" : active ? "text-cyan-400 font-bold" : "text-zinc-500"
        ].join(" ")}>
          {label}
        </div>
      </div>

      <div className={[
        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-all duration-300",
        done ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "",
        active ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-300 animate-pulse" : "",
        !done && !active ? "border-zinc-800 bg-zinc-900/50 text-zinc-600" : ""
      ].join(" ")}>
        {done ? "COMPLETE" : active ? "ANALYZING" : "QUEUED"}
      </div>
    </motion.div>
  );
}

export default function InferenceLoading({ stage = 0 }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan-500/15 bg-[#090b10]/85 p-6 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.95)] backdrop-blur-md">
      {/* Background neon and grid */}
      <div className="pointer-events-none absolute inset-0 opacity-80 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.1),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.1),transparent_60%)]" />
        <div className="absolute inset-0 axiom-cyber-grid opacity-20" />
        <div className="absolute inset-0 axiom-noise-texture" />
      </div>

      {/* Dynamic Laser Line Sweep */}
      <div className="axiom-laser-line" />

      <div className="relative z-10 flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-400">
            Forensic Intelligence
          </div>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-white">
            Executing Verification Pipeline
          </h3>
        </div>
        <div className="relative h-11 w-11 shrink-0">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <motion.div 
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-fuchsia-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 grid place-items-center text-[10px] font-bold text-cyan-400">
            {Math.round((stage / 4) * 100)}%
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 space-y-3">
        <Step label="Error Level Analysis (Recompression Scan)" active={stage === 0} done={stage > 0} index={0} />
        <Step label="Deep Learning Convolutional Tamper Classifier" active={stage === 1} done={stage > 1} index={1} />
        <Step label="Ensemble Arbitration & Weighted Scoring" active={stage === 2} done={stage > 2} index={2} />
        <Step label="TRAE Language Logic Model Forensic Synthesis" active={stage === 3} done={stage > 3} index={3} />
      </div>

      <div className="relative z-10 mt-5 overflow-hidden rounded-xl border border-white/5 bg-black/40 p-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <div className="text-xs font-mono text-cyan-400/80 tracking-wider">
            [SYS_INF] Core initialized. Scanning matrix overlays...
          </div>
        </div>
      </div>
    </div>
  );
}
