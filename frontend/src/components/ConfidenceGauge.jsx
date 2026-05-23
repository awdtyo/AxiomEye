import React from "react";
import { motion } from "framer-motion";

export default function ConfidenceGauge({ value }) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const pct = Math.round(v * 100);
  const r = 45;
  const c = 2 * Math.PI * r;
  const dashOffset = c * (1 - v);

  // Gradient stops base values
  const gradientId = "axiomPremiumGaugeGradient";
  const filterId = "axiomPremiumGlowFilter";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl border border-white/5 bg-black/25 shadow-inner">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Inner ring */}
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth="9"
          />
          {/* Dynamic animated progress ring */}
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            filter={`url(#${filterId})`}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          {/* Small dot tracking marker at the head of progress */}
          {v > 0 && (
            <motion.circle
              cx={60 + r * Math.cos(-Math.PI / 2 + v * 2 * Math.PI)}
              cy={60 + r * Math.sin(-Math.PI / 2 + v * 2 * Math.PI)}
              r="4"
              fill="#ffffff"
              filter="drop-shadow(0 0 4px rgba(255,255,255,0.8))"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <motion.span 
              className="text-2xl font-bold tracking-tight text-white block bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-400"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {pct}%
            </motion.span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-zinc-400 block mt-0.5">
              Confidence
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 text-center sm:text-left">
        <div className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
          AI Consensus Score
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
          Reflects the level of agreement and correlation strength across visual artifacts, ELA heatmaps, and CNN classifiers.
        </p>
      </div>
    </div>
  );
}
