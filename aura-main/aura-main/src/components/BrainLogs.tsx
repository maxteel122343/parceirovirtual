import React from "react";
import { EmotionState, Message } from "../types";
import { Brain, Heart, Eye, Activity } from "lucide-react";

interface BrainLogsProps {
  currentEmotion: EmotionState;
  lastMessage: Message | null;
  status: "idle" | "listening" | "thinking" | "speaking";
}

export const BrainLogs: React.FC<BrainLogsProps> = ({
  currentEmotion,
  lastMessage,
  status,
}) => {
  // Extract details from the last assistant message
  const secretThought = lastMessage?.thought || "Sintonizando com sua energia... Diga algo para despertar meus pensamentos.";
  const userAnalysis = lastMessage?.userAnalysis || "Observando tom de voz, ritmo e emoção nas entrelinhas.";

  return (
    <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-5 h-full">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
            Frequência Neural da Aura
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="text-[10px] font-mono text-indigo-300 uppercase">
            {status === "idle" ? "Estável" : status === "listening" ? "Sincronizando" : status === "thinking" ? "Processando" : "Transmitindo"}
          </span>
        </div>
      </div>

      {/* Dynamic Waveform Graphic */}
      <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-slate-400" /> Onda Sináptica ({currentEmotion.label})
          </span>
          <span className="text-right">62.4 Hz</span>
        </div>
        <div className="h-16 flex items-end justify-between gap-1 px-1 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => {
            // Determine wave height based on status and indices
            let height = "h-2";
            if (status === "thinking") {
              const pulse = Math.sin((Date.now() / 150) + i) * 18 + 22;
              height = `${Math.max(10, Math.min(100, Math.round(pulse)))}%`;
            } else if (status === "speaking") {
              const seed = Math.sin((Date.now() / 100) + i * 1.5) * 28 + 32;
              height = `${Math.max(15, Math.min(100, Math.round(seed)))}%`;
            } else if (status === "listening") {
              const ambient = Math.sin((Date.now() / 250) + i * 0.8) * 12 + 18;
              height = `${Math.max(8, Math.min(100, Math.round(ambient)))}%`;
            } else {
              // Idle state - calm standard wave
              const calm = Math.sin(i * 0.3) * 6 + 10;
              height = `${Math.round(calm)}%`;
            }

            return (
              <div
                key={i}
                className="w-full rounded-t-sm transition-all duration-300 bg-gradient-to-t"
                style={{
                  height,
                  backgroundImage: `linear-gradient(to top, var(--color-slate-800), ${currentEmotion.color})`,
                  opacity: status === "idle" ? 0.3 : 0.8,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Aura's Internal Subconscious Thoughts */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider font-mono text-pink-400">
          <Heart className="w-3.5 h-3.5" />
          <span>Subconsciente (Pensamento Secreto)</span>
        </div>
        <div className="bg-pink-500/5 hover:bg-pink-500/10 transition-colors border border-pink-500/15 rounded-xl p-3.5 min-h-[70px] flex items-start gap-2.5">
          <div className="text-xl filter drop-shadow">💭</div>
          <p className="text-xs text-pink-100/90 leading-relaxed italic select-all">
            &ldquo;{secretThought}&rdquo;
          </p>
        </div>
      </div>

      {/* Psychological User Analysis */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider font-mono text-teal-400">
          <Eye className="w-3.5 h-3.5" />
          <span>Análise Empática do Usuário</span>
        </div>
        <div className="bg-teal-500/5 hover:bg-teal-500/10 transition-colors border border-teal-500/15 rounded-xl p-3.5 min-h-[70px] flex items-start gap-2.5">
          <div className="text-xl filter drop-shadow">🎯</div>
          <p className="text-xs text-teal-100/90 leading-relaxed select-all">
            {userAnalysis}
          </p>
        </div>
      </div>
    </div>
  );
};
