import { useRef, useEffect, useState } from "react";
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
  alt?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  "shadow-intensity"?: string;
  exposure?: string;
  "environment-image"?: string;
  "interaction-prompt"?: string;
  "interaction-prompt-threshold"?: string;
  "camera-orbit"?: string;
  "min-camera-orbit"?: string;
  "max-camera-orbit"?: string;
  "field-of-view"?: string;
  "loading"?: string;
  reveal?: string;
  scale?: string;
  "ar-scale"?: string;
}

const SIZES = [
  { id: "15", label: "15 см", scale: 0.75, servings: "4–6",   price: 0 },
  { id: "20", label: "20 см", scale: 1.0,  servings: "8–10",  price: 0 },
  { id: "25", label: "25 см", scale: 1.25, servings: "12–15", price: 0 },
  { id: "30", label: "30 см", scale: 1.5,  servings: "18–20", price: 0 },
] as const;

interface Props {
  glbUrl: string | null;
  name: string;
  basePrice: number;
  onSizeChange?: (size: (typeof SIZES)[number], price: number) => void;
}

const SIZE_INCREMENT = 5000;
const CAT_COLORS_3D: Record<string, string> = {
  cake: "#0E5C37",
  dessert: "#E94D72",
  bread: "#8B6914",
  salad: "#4A8C5C",
  coffee: "#6F4E37",
};

export default function CakeViewer3D({ glbUrl, name, basePrice, onSizeChange }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"image" | "3d">("3d");
  const [sizeIdx, setSizeIdx] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const activeSize = SIZES[sizeIdx];
  const sizedPrice = basePrice + (sizeIdx * SIZE_INCREMENT);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const onLoad = () => { setLoading(false); setError(false); };
    const onError = () => { setError(true); setLoading(false); };
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    return () => { el.removeEventListener("load", onLoad); el.removeEventListener("error", onError); };
  }, [glbUrl]);

  useEffect(() => {
    onSizeChange?.(activeSize, sizedPrice);
  }, [sizeIdx]);

  const handleScreenshot = async () => {
    const el = ref.current as any;
    if (!el?.toBlob) return;
    try {
      const blob = await el.toBlob();
      if (!blob) return;
      if ((navigator as any).share && (navigator as any).canShare?.({ files: [new File([blob], "cake.png", { type: "image/png" })] })) {
        await (navigator as any).share({ files: [new File([blob], "cake.png", { type: "image/png" })] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${name}.png`; a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* user cancelled share */ }
  };

  if (mode === "image" || !glbUrl) {
    return null;
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #1A2E1A, #0E2D1B)" }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              <span className="text-[11px] text-white/50" style={{ fontFamily: "var(--font-sans)" }}>Ачаалж байна...</span>
            </div>
          </div>
        )}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[13px] text-white/60" style={{ fontFamily: "var(--font-sans)" }}>3D загвар ачааллахад алдаа гарлаа</p>
          </div>
        ) : (
          <model-viewer
            ref={ref}
            src={glbUrl}
            alt={name}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            auto-rotate
            shadow-intensity="0.8"
            exposure="1.1"
            environment-image="neutral"
            interaction-prompt="none"
            loading="lazy"
            reveal="auto"
            scale={`${activeSize.scale} ${activeSize.scale} ${activeSize.scale}`}
            style={{ width: "100%", height: "100%", "--poster-color": "transparent" as any }}
          />
        )}

        {!error && (
          <>
            <button onClick={() => setMode("image")}
              className="absolute top-2 right-2 size-8 rounded-full flex items-center justify-center z-10"
              style={{ background: "rgba(0,0,0,0.4)" }}
              aria-label="Close 3D viewer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>

            {glbUrl && (
              <button onClick={handleScreenshot}
                className="absolute bottom-2 right-2 size-8 rounded-full flex items-center justify-center z-10"
                style={{ background: "rgba(0,0,0,0.4)" }}
                aria-label="Take photo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-2 px-1">
        {SIZES.map((s, i) => (
          <button key={s.id} onClick={() => setSizeIdx(i)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
            style={{
              background: i === sizeIdx ? H_primary : "rgba(14,92,55,0.06)",
              color: i === sizeIdx ? "white" : "#6B6B5A",
              fontFamily: "var(--font-sans)",
            }}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[11px]" style={{ fontFamily: "var(--font-sans)", color: "#6B6B5A" }}>
          ⌀ {activeSize.id} см · {activeSize.servings} порц
        </span>
        <span className="text-[13px] font-bold" style={{ fontFamily: "var(--font-display)", color: "#0E5C37", fontVariantNumeric: "tabular-nums" }}>
          {fmtPrice(sizedPrice)}
        </span>
      </div>
    </div>
  );
}

const H_primary = "#0E5C37";

function fmtPrice(n: number) {
  return "₮" + n.toLocaleString();
}
