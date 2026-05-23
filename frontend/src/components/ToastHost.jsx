import React from "react";
import { AnimatePresence, motion } from "framer-motion";

const ToastContext = React.createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const notify = React.useCallback((toast) => {
    const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    const t = {
      id,
      title: toast?.title || "",
      message: toast?.message || "",
      tone: toast?.tone || "info",
      ttl: Number.isFinite(toast?.ttl) ? toast.ttl : 2800
    };
    setToasts((s) => [t, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), t.ttl);
  }, []);

  const value = React.useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 w-[min(380px,calc(100vw-2rem))] space-y-3">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className={[
                "pointer-events-auto overflow-hidden rounded-2xl border bg-[#090b10]/90 p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)] backdrop-blur-md relative z-50",
                t.tone === "success"
                  ? "border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                  : "",
                t.tone === "error"
                  ? "border-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.08)]"
                  : "",
                t.tone === "info"
                  ? "border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.06)]"
                  : ""
              ].join(" ")}
            >
              {/* Colored left indicator line */}
              <div 
                className={[
                  "absolute left-0 top-0 bottom-0 w-[3px]",
                  t.tone === "success" ? "bg-emerald-400" : "",
                  t.tone === "error" ? "bg-rose-400" : "",
                  t.tone === "info" ? "bg-cyan-400" : ""
                ].join(" ")}
              />

              <div className="flex items-start gap-3 pl-1">
                {/* Visual Status Indicator Light */}
                <div
                  className={[
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    t.tone === "success" ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "",
                    t.tone === "error" ? "bg-rose-400 shadow-[0_0_8px_#f43f5e]" : "",
                    t.tone === "info" ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : ""
                  ].join(" ")}
                />
                
                <div className="min-w-0 flex-1">
                  {t.title ? (
                    <div className="text-xs font-bold tracking-wider uppercase text-zinc-100">
                      {t.title}
                    </div>
                  ) : null}
                  {t.message ? (
                    <div className="mt-1 text-xs text-zinc-300 leading-relaxed font-mono">
                      {t.message}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Linear sweep timing bar */}
              <div className="mt-3.5 h-[2px] w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className={[
                    "h-full",
                    t.tone === "success"
                      ? "bg-emerald-400"
                      : t.tone === "error"
                        ? "bg-rose-400"
                        : "bg-cyan-400"
                  ].join(" ")}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: t.ttl / 1000, ease: "linear" }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export default function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) return { notify: () => {} };
  return ctx;
}
export { useToast };
