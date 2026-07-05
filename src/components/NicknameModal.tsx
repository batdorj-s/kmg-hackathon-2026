import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, ArrowRight, Sparkles } from "lucide-react";

const H = {
  primary:   "#0E5C37",
  secondary: "#18472D",
  bg:        "#F4EFD8",
  card:      "#FAFAF8",
  text:      "#2F2F2F",
  muted:     "#6B6B5A",
  gold:      "#F6B623",
  border:    "rgba(14,92,55,0.09)",
};
const fontSans    = "var(--font-sans)";
const fontDisplay = "var(--font-display)";
const ease        = [0.23, 1, 0.32, 1] as const;

export function NicknameModal({ onConfirm }: { onConfirm: (name: string) => void }) {
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitted(true);
    setTimeout(() => onConfirm(trimmed), 600);
  };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[80] flex items-center justify-center px-6"
        style={{ background: "rgba(0,0,0,0.45)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="w-full max-w-sm rounded-3xl overflow-hidden"
          style={{ background: H.card, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}>
          {submitted ? (
            <div className="flex flex-col items-center py-16 px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 16 }}>
                <div className="size-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})` }}>
                  <Sparkles size={30} color="white" />
                </div>
              </motion.div>
              <p className="text-[17px] font-bold" style={{ fontFamily: fontDisplay, color: H.text }}>
                Тавтай морил!
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center pt-10 pb-3 px-6">
                <motion.div className="size-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `linear-gradient(135deg, ${H.secondary}, ${H.primary})`,
                    boxShadow: "0 8px 24px rgba(14,92,55,0.30)" }}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                  <User size={28} color="white" strokeWidth={1.6} />
                </motion.div>
                <h1 className="text-[22px] font-bold text-center" style={{ fontFamily: fontDisplay, color: H.text }}>
                  Та хэн бэ?
                </h1>
                <p className="text-[12px] text-center mt-1" style={{ fontFamily: fontSans, color: H.muted }}>
                  Тоглоом тоглож, оноо цуглуулахад нэр хэрэгтэй
                </p>
              </div>
              <div className="px-6 pb-6">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
                  style={{ background: H.bg, border: `1.5px solid ${name.trim() ? H.primary : H.border}` }}>
                  <User size={16} color={name.trim() ? H.primary : H.muted} />
                  <input
                    className="flex-1 text-[15px] outline-none bg-transparent"
                    style={{ fontFamily: fontSans, color: H.text }}
                    placeholder="Нэрээ оруулна уу..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    maxLength={20}
                    autoFocus
                  />
                </div>
                <motion.button
                  onClick={handleSubmit}
                  className="w-full h-13 rounded-full flex items-center justify-center gap-2 font-bold text-[16px] text-white"
                  style={{
                    background: name.trim()
                      ? `linear-gradient(135deg, ${H.secondary}, ${H.primary})`
                      : H.accent,
                    fontFamily: fontDisplay,
                    boxShadow: name.trim() ? "0 6px 20px rgba(14,92,55,0.32)" : "none",
                  }}
                  whileTap={name.trim() ? { scale: 0.97 } : {}}
                  disabled={!name.trim()}>
                  <ArrowRight size={18} color="white" strokeWidth={2.2} />
                  Эхлэх
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
