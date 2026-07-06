import { useRef, useEffect, useState, useCallback } from "react";
import "@google/model-viewer";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes & React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

interface ModelViewerAttributes {
  src?: string;
  "ios-src"?: string;
  alt?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "ar-scale"?: string;
  "ar-placement"?: string;
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  "auto-rotate-delay"?: string;
  "rotation-per-second"?: string;
  "shadow-intensity"?: string;
  "shadow-softness"?: string;
  exposure?: string;
  "tone-mapping"?: string;
  "environment-image"?: string;
  "interaction-prompt"?: string;
  "interaction-prompt-threshold"?: string;
  "camera-orbit"?: string;
  "min-camera-orbit"?: string;
  "max-camera-orbit"?: string;
  "field-of-view"?: string;
  "min-field-of-view"?: string;
  "max-field-of-view"?: string;
  "loading"?: string;
  reveal?: string;
  scale?: string;
}

// Real, retail-accurate size table. `cm` drives the true AR scale; the rest is shown in the
// dimension panel. `heightRatio` = height ÷ diameter, used to display a believable height.
const SIZES = [
  { id: "15", cm: 15, label: "15 см", servings: "4–6",   weight: "0.8 кг", priceAdd: 0 },
  { id: "20", cm: 20, label: "20 см", servings: "8–10",  weight: "1.4 кг", priceAdd: 8000 },
  { id: "25", cm: 25, label: "25 см", servings: "12–15", weight: "2.2 кг", priceAdd: 18000 },
  { id: "30", cm: 30, label: "30 см", servings: "18–20", weight: "3.2 кг", priceAdd: 30000 },
] as const;

interface Props {
  glbUrl: string | null;
  name: string;
  basePrice: number;
  onSizeChange?: (size: (typeof SIZES)[number], price: number) => void;
}

const H_primary = "#0E5C37";
const H_gold = "#C79A3B";

function fmtPrice(n: number) {
  return "₮" + n.toLocaleString();
}

export default function CakeViewer3D({ glbUrl, name, basePrice, onSizeChange }: Props) {
  const ref = useRef<HTMLElement>(null);
  // Natural (unscaled) model size in metres — measured once from the loaded GLB so we can
  // place it at exact real-world centimetres in AR, regardless of how the GLB was authored.
  const naturalRef = useRef<{ w: number; h: number } | null>(null);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [arAvailable, setArAvailable] = useState(false);
  const [arHint, setArHint] = useState(false);
  const [inAR, setInAR] = useState(false);

  const activeSize = SIZES[sizeIdx];
  const sizedPrice = basePrice + activeSize.priceAdd;

  // Uniform scale factor that makes the model's diameter equal the selected size in metres.
  const scaleFactorFor = useCallback((cm: number) => {
    const nat = naturalRef.current;
    if (!nat || nat.w <= 0) return 1;
    return (cm / 100) / nat.w;
  }, []);

  // Apply the true-to-life scale to the <model-viewer> (drives both the viewer and AR).
  const applyScale = useCallback((cm: number) => {
    const el = ref.current;
    if (!el) return;
    const f = scaleFactorFor(cm);
    el.setAttribute("scale", `${f} ${f} ${f}`);
  }, [scaleFactorFor]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onLoad = () => {
      setLoading(false);
      setError(false);
      // Measure the natural (unscaled) size once. The viewer keeps the model at natural
      // scale so it stays nicely framed; the true-to-life cm scale is applied only for AR.
      if (!naturalRef.current) {
        const dims = (el as unknown as { getDimensions?: () => { x: number; y: number; z: number } }).getDimensions?.();
        if (dims) {
          const w = Math.max(dims.x, dims.z);
          if (w > 0) naturalRef.current = { w, h: dims.y };
        }
      }
      setArAvailable(Boolean((el as unknown as { canActivateAR?: boolean }).canActivateAR));
    };
    const onError = () => { setError(true); setLoading(false); };
    const onProgress = (e: Event) => {
      const p = (e as CustomEvent<{ totalProgress: number }>).detail?.totalProgress ?? 0;
      setProgress(Math.round(p * 100));
    };
    const onArStatus = (e: Event) => {
      const status = (e as CustomEvent<{ status: string }>).detail?.status;
      setInAR(status === "session-started");
      // Returning from AR → restore the natural viewer scale so framing stays correct.
      if (status === "not-presenting") ref.current?.setAttribute("scale", "1 1 1");
    };

    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    el.addEventListener("progress", onProgress);
    el.addEventListener("ar-status", onArStatus);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
      el.removeEventListener("progress", onProgress);
      el.removeEventListener("ar-status", onArStatus);
    };
  }, [glbUrl, applyScale, sizeIdx]);

  // Report price whenever the size changes (scale is applied on AR entry, not in the viewer).
  useEffect(() => {
    onSizeChange?.(activeSize, sizedPrice);
  }, [sizeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const realHeightCm = (() => {
    const nat = naturalRef.current;
    if (!nat || nat.w <= 0) return Math.round(activeSize.cm * 0.6); // fallback proportion
    return Math.max(1, Math.round((nat.h / nat.w) * activeSize.cm));
  })();

  const enterAR = async () => {
    const el = ref.current as unknown as { activateAR?: () => Promise<void>; canActivateAR?: boolean } | null;
    if (!el) return;
    if (!el.canActivateAR) {
      // Desktop / unsupported browser — don't disturb the viewer, just guide the user.
      setArHint(true);
      setTimeout(() => setArHint(false), 4200);
      return;
    }
    applyScale(activeSize.cm); // place the cake at the exact selected real-world size
    try { await el.activateAR(); } catch { /* user dismissed */ }
  };

  const handleScreenshot = async () => {
    const el = ref.current as unknown as { toBlob?: () => Promise<Blob | null> } | null;
    if (!el?.toBlob) return;
    try {
      const blob = await el.toBlob();
      if (!blob) return;
      const file = new File([blob], `${name}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file] } as ShareData);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${name}.png`; a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* user cancelled */ }
  };

  if (!glbUrl) return null;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* ── 3D stage ── */}
      <div className="flex-1 relative rounded-3xl overflow-hidden"
        style={{ background: "radial-gradient(120% 100% at 50% 0%, #22371F 0%, #14261A 55%, #0C1E12 100%)" }}>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="size-9 rounded-full border-2 border-white/15 border-t-white/80 animate-spin" />
              <span className="text-[11px] text-white/55" style={{ fontFamily: "var(--font-sans)" }}>
                3D загвар ачаалж байна{progress > 0 ? ` · ${progress}%` : "..."}
              </span>
            </div>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-[13px] text-white/70" style={{ fontFamily: "var(--font-sans)" }}>3D загвар ачааллахад алдаа гарлаа</p>
            <p className="text-[11px] text-white/40" style={{ fontFamily: "var(--font-sans)" }}>Бүтээгдэхүүний зургийг үзнэ үү</p>
          </div>
        ) : (
          <model-viewer
            ref={ref}
            src={glbUrl}
            alt={name}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="floor"
            camera-controls
            auto-rotate
            auto-rotate-delay="1200"
            rotation-per-second="18deg"
            shadow-intensity="1"
            shadow-softness="0.9"
            exposure="1.15"
            tone-mapping="neutral"
            environment-image="neutral"
            interaction-prompt="none"
            min-field-of-view="18deg"
            max-field-of-view="45deg"
            loading="eager"
            reveal="auto"
            style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
          />
        )}

        {!error && !loading && (
          <>
            {/* Gesture hint */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full flex items-center gap-1.5 z-10"
              style={{ background: "rgba(0,0,0,0.32)", backdropFilter: "blur(8px)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.85"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 3v6h6"/></svg>
              <span className="text-[10px] text-white/75" style={{ fontFamily: "var(--font-sans)" }}>Чирж эргүүлэх · Хумсдаж томруулах</span>
            </div>

            <button onClick={handleScreenshot}
              className="absolute bottom-3 right-3 size-9 rounded-full flex items-center justify-center z-10"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
              aria-label="Зураг авах">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </>
        )}
      </div>

      {/* ── AR call-to-action ── */}
      {!error && (
        <button onClick={enterAR}
          className="w-full mt-3 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-[15px] text-white active:scale-[0.98] transition-transform"
          style={{ background: `linear-gradient(135deg, #14764A, ${H_primary})`, fontFamily: "var(--font-display)", boxShadow: "0 8px 20px rgba(14,92,55,0.28)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg>
          {inAR ? "AR идэвхтэй" : `AR-р ${activeSize.cm} см бодит хэмжээгээр үзэх`}
        </button>
      )}

      {arHint && (
        <p className="text-[11px] text-center mt-2 px-3 py-2 rounded-xl"
          style={{ fontFamily: "var(--font-sans)", color: "#8A6D1F", background: "rgba(199,154,59,0.12)" }}>
          AR-г ашиглахын тулд энэ хуудсыг гар утсаараа (iOS Safari / Android Chrome) нээнэ үү.
        </p>
      )}

      {/* ── Size selector ── */}
      <div className="flex items-center gap-1.5 mt-3 px-0.5">
        {SIZES.map((s, i) => (
          <button key={s.id} onClick={() => setSizeIdx(i)}
            className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors"
            style={{
              background: i === sizeIdx ? H_primary : "rgba(14,92,55,0.06)",
              color: i === sizeIdx ? "white" : "#6B6B5A",
              fontFamily: "var(--font-sans)",
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Real dimension panel ── */}
      <div className="mt-2.5 rounded-2xl px-3.5 py-2.5 flex items-center justify-between"
        style={{ background: "rgba(14,92,55,0.05)", border: "1px solid rgba(14,92,55,0.08)" }}>
        <div className="flex items-center gap-4">
          <Dim label="Диаметр" value={`${activeSize.cm} см`} />
          <Dim label="Өндөр" value={`${realHeightCm} см`} />
          <Dim label="Порц" value={activeSize.servings} />
          <Dim label="Жин" value={activeSize.weight} />
        </div>
        <span className="text-[15px] font-bold" style={{ fontFamily: "var(--font-display)", color: H_primary, fontVariantNumeric: "tabular-nums" }}>
          {fmtPrice(sizedPrice)}
        </span>
      </div>
    </div>
  );
}

function Dim({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wide" style={{ fontFamily: "var(--font-sans)", color: "#9A9A88" }}>{label}</span>
      <span className="text-[12px] font-bold" style={{ fontFamily: "var(--font-sans)", color: "#3A3A2E", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
