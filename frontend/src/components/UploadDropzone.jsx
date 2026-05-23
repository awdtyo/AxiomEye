import React from "react";
import { motion } from "framer-motion";
import { useToast } from "./ToastHost.jsx";

export default function UploadDropzone({ onFile }) {
  const inputRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);
  const { notify } = useToast();

  const openPicker = () => {
    inputRef.current?.click();
  };

  const acceptFile = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      notify({ tone: "error", title: "Invalid File", message: "Please upload an image (JPG/PNG/WEBP).", ttl: 3200 });
      return;
    }
    notify({ tone: "success", title: "Upload Queued", message: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`, ttl: 2500 });
    onFile?.(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer?.files?.[0];
    acceptFile(file);
  };

  return (
    <div className="axiom-glass-card rounded-3xl p-6 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] transition-all duration-300">
      <motion.div
        className={[
          "group relative grid min-h-[260px] place-items-center overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer",
          drag
            ? "border-cyan-400/40 bg-cyan-950/10 shadow-[0_0_40px_rgba(34,211,238,0.18)]"
            : "border-white/5 bg-black/30 hover:border-white/10 hover:bg-black/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.06)]"
        ].join(" ")}
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={openPicker}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Animated Dashed Border Overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl p-[1.5px]">
          <div
            className={[
              "absolute inset-0 rounded-2xl transition-opacity duration-300",
              drag ? "axiom-dashed opacity-100" : "axiom-dashed opacity-25 group-hover:opacity-40"
            ].join(" ")}
          />
          <div className="absolute inset-[1px] rounded-2xl bg-[#090b10]/90" />
        </div>

        {/* Cyberpunk Glow and Grid Background */}
        <div className="pointer-events-none absolute inset-0 opacity-80 z-0">
          <div className={["absolute inset-0 transition-opacity duration-500", drag ? "opacity-100" : "opacity-40"].join(" ")}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(34,211,238,0.08),transparent_55%),radial-gradient(circle_at_85%_65%,rgba(168,85,247,0.08),transparent_60%),radial-gradient(circle_at_15%_85%,rgba(244,63,94,0.06),transparent_60%)]" />
          </div>
          <div className="absolute inset-0 axiom-cyber-grid opacity-30" />
          <div className="absolute inset-0 axiom-noise-texture" />
        </div>

        {/* Dynamic Radar Ring Ripples on Drag-Over */}
        {drag && (
          <>
            <div className="axiom-radar-ring h-44 w-44" />
            <div className="axiom-radar-ring-delayed h-44 w-44" />
          </>
        )}

        <div className="relative z-10 max-w-sm text-center px-4">
          <motion.div 
            className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(34,211,238,0.15)] group-hover:shadow-[0_0_40px_rgba(168,85,247,0.25)] transition-all duration-300"
            animate={drag ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg 
              className="h-8 w-8 text-cyan-400 group-hover:text-fuchsia-400 transition-colors duration-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </motion.div>

          <div className="mt-5 text-base font-semibold tracking-tight text-zinc-100 group-hover:text-cyan-300 transition-colors duration-200">
            {drag ? "Drop the file here" : "Drag & drop your image"}
          </div>
          <div className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
            JPG, PNG, or WEBP formats. AxiomEye will automatically execute ELA, CNN forensics, and AI arbitration.
          </div>

          <motion.button
            type="button"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 text-zinc-950 px-6 py-2 text-xs font-semibold tracking-wider uppercase transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
          >
            Choose File
          </motion.button>
        </div>
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />
    </div>
  );
}
