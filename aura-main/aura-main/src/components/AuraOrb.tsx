import React, { useMemo } from "react";
import { EmotionState, EmotionType } from "../types";
import { Mic, MicOff, Sparkles, Volume2, Loader2 } from "lucide-react";

interface AuraOrbProps {
  currentEmotion: EmotionState;
  status: "idle" | "listening" | "thinking" | "speaking";
  isHandsFree: boolean;
  onToggleRecord: () => void;
}

export const AuraOrb: React.FC<AuraOrbProps> = ({
  currentEmotion,
  status,
  isHandsFree,
  onToggleRecord,
}) => {
  // Determine animation speeds and scale sizes based on the status
  const pulseClass = useMemo(() => {
    switch (status) {
      case "listening":
        return "animate-pulse scale-105 border-teal-400/50 shadow-[0_0_40px_rgba(45,212,191,0.5)]";
      case "thinking":
        return "animate-pulse scale-95 border-indigo-400/30 shadow-[0_0_30px_rgba(129,140,248,0.3)]";
      case "speaking":
        return "scale-110 shadow-[0_0_60px_rgba(244,114,182,0.6)] duration-200";
      case "idle":
      default:
        return "hover:scale-105 duration-500 shadow-[0_0_30px_rgba(255,255,255,0.1)]";
    }
  }, [status]);

  // Descriptions for current actions
  const statusLabel = useMemo(() => {
    switch (status) {
      case "listening":
        return "Aura está te ouvindo...";
      case "thinking":
        return "Aura está pensando...";
      case "speaking":
        return "Aura está falando";
      case "idle":
      default:
        return "Clique para falar com a Aura";
    }
  }, [status]);

  // Center icon to represent state
  const centerIcon = useMemo(() => {
    switch (status) {
      case "listening":
        return <Mic className="w-8 h-8 text-teal-300 animate-bounce" />;
      case "thinking":
        return <Loader2 className="w-8 h-8 text-indigo-300 animate-spin" />;
      case "speaking":
        return <Volume2 className="w-8 h-8 text-white animate-pulse" />;
      case "idle":
      default:
        return <Mic className="w-8 h-8 text-gray-300 group-hover:text-white transition-colors duration-300" />;
    }
  }, [status]);

  return (
    <div className="flex flex-col items-center justify-center py-6 select-none">
      {/* Container with dynamic glow */}
      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Layer 1: Ambient Background Glow that spreads wide */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-1000 blur-3xl opacity-40 bg-gradient-to-r ${currentEmotion.gradient}`}
          style={{
            transform: status === "speaking" ? "scale(1.25)" : status === "listening" ? "scale(1.1)" : "scale(1)",
          }}
        />

        {/* Layer 2: Animated Outer Ripple Rings (Only when listening or speaking) */}
        {(status === "listening" || status === "speaking") && (
          <>
            <div
              className={`absolute inset-0 rounded-full border border-white/20 bg-gradient-to-r ${currentEmotion.gradient} opacity-20 animate-ping`}
              style={{ animationDuration: status === "speaking" ? "1.5s" : "2.5s" }}
            />
            <div
              className="absolute -inset-4 rounded-full border border-white/10 animate-spin"
              style={{ animationDuration: "12s", animationDirection: "reverse" }}
            />
            <div
              className="absolute -inset-8 rounded-full border border-dashed border-white/5 animate-spin"
              style={{ animationDuration: "20s" }}
            />
          </>
        )}

        {/* Layer 3: The Pulsing Physical Orb Core */}
        <button
          id="aura-core-orb-button"
          onClick={onToggleRecord}
          className={`group relative w-60 h-60 rounded-full border border-white/15 bg-slate-900/40 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all ${pulseClass}`}
        >
          {/* Rotating gradient mesh background inside the glass orb */}
          <div
            className={`absolute inset-0 opacity-45 bg-gradient-to-tr ${currentEmotion.gradient} animate-spin`}
            style={{ animationDuration: status === "speaking" ? "4s" : "8s" }}
          />

          {/* Suttle inner light reflections */}
          <div className="absolute top-3 left-10 w-24 h-12 bg-white/10 rounded-full filter blur-sm transform -rotate-12" />
          <div className="absolute bottom-4 right-12 w-16 h-8 bg-white/5 rounded-full filter blur-sm transform rotate-12" />

          {/* Central contents */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-2 text-center px-4">
            {/* Emotion Emoji with floating animation */}
            <div
              className={`text-5xl mb-2 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ${
                status === "speaking" ? "scale-110 -translate-y-1 animate-bounce" : "group-hover:scale-110"
              }`}
            >
              {currentEmotion.emoji}
            </div>

            {/* Icon */}
            <div className="p-3 bg-white/5 rounded-full backdrop-blur-md border border-white/10 transition-colors group-hover:bg-white/15">
              {centerIcon}
            </div>

            {/* Mode Tag */}
            <div className="mt-2 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-black/30 text-white/60 border border-white/5">
              {status === "listening" ? "Microfone Ativo" : isHandsFree ? "Viva-Voz" : "Toque p/ Falar"}
            </div>
          </div>
        </button>
      </div>

      {/* Dynamic Status Title */}
      <div className="text-center mt-6 z-10">
        <h2 className="text-xl font-medium tracking-tight text-white mb-1 transition-all duration-300">
          {statusLabel}
        </h2>
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Aura está se sentindo</span>
          <span
            className="font-semibold transition-colors duration-500"
            style={{ color: currentEmotion.color.replace("0.6", "1.0") }}
          >
            {currentEmotion.label}
          </span>
        </div>
      </div>
    </div>
  );
};
