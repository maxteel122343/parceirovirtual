import React, { useEffect, useState } from "react";
import { Volume2, VolumeX, Mic, MicOff, Settings, Play } from "lucide-react";

interface VoiceSettingsProps {
  selectedVoiceName: string;
  onVoiceChange: (voiceName: string) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isHandsFree: boolean;
  onHandsFreeChange: (isHandsFree: boolean) => void;
  onTestSpeech: () => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  selectedVoiceName,
  onVoiceChange,
  volume,
  onVolumeChange,
  isHandsFree,
  onHandsFreeChange,
  onTestSpeech,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const allVoices = window.speechSynthesis.getVoices();
        // Filter primarily for Portuguese voices, but fallback to all voices if none found
        const ptVoices = allVoices.filter(
          (v) => v.lang.startsWith("pt") || v.lang.includes("PT")
        );
        
        // Sort to place Premium/Google/Microsoft Online/Natural voices first
        const sortedPtVoices = [...ptVoices].sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aIsPref = aName.includes("google") || aName.includes("natural") || aName.includes("online") || aName.includes("neural") || aName.includes("samantha");
          const bIsPref = bName.includes("google") || bName.includes("natural") || bName.includes("online") || bName.includes("neural") || bName.includes("samantha");
          if (aIsPref && !bIsPref) return -1;
          if (!aIsPref && bIsPref) return 1;
          return 0;
        });

        setVoices(sortedPtVoices.length > 0 ? sortedPtVoices : allVoices);
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  return (
    <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-400" />
          <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
            Ajustes do Sintetizador
          </h3>
        </div>
      </div>

      {/* Voice Selector */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="voice-select" className="text-xs font-semibold text-slate-300 font-mono">
          Modelo de Voz (PT-BR)
        </label>
        <div className="flex gap-2">
          <select
            id="voice-select"
            value={selectedVoiceName}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="flex-1 text-xs bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-white/95 focus:outline-none focus:border-teal-400/50 cursor-pointer"
          >
            {voices.length === 0 ? (
              <option value="">Voz Padrão do Sistema</option>
            ) : (
              voices.map((voice) => {
                const nameLower = voice.name.toLowerCase();
                const isPremium = nameLower.includes("google") || nameLower.includes("natural") || nameLower.includes("online") || nameLower.includes("neural") || nameLower.includes("samantha");
                return (
                  <option key={voice.name} value={voice.name}>
                    {isPremium ? "✨ " : ""}{voice.name} ({voice.lang})
                  </option>
                );
              })
            )}
          </select>
          <button
            id="test-voice-speech-button"
            onClick={onTestSpeech}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors duration-200 flex items-center justify-center cursor-pointer"
            title="Testar síntese de voz"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-teal-400/80 leading-normal font-sans">
          💡 <strong>Dica de ouro:</strong> Escolha as vozes marcadas com ✨ (como <em>Google Português</em> ou vozes <em>Online/Neural</em>). Elas usam servidores de nuvem de alta fidelidade e soam idênticas a uma pessoa real, mudando completamente a fluidez!
        </p>
      </div>

      {/* Volume slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 font-mono">Volume Geral</span>
          <span className="font-mono text-slate-400 text-[11px]">{Math.round(volume * 100)}%</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="toggle-volume-mute-button"
            onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
            className="text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
          </button>
          <input
            id="slider-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>
      </div>

      {/* Continuous Auto Talk / Viva-Voz Mode */}
      <div className="flex items-center justify-between bg-black/30 border border-white/5 rounded-xl p-3 mt-1.5 hover:border-teal-400/20 transition-all">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-teal-400" /> Viva-Voz Automático
          </span>
          <p className="text-[10px] text-slate-400 max-w-[200px]">
            Inicia o microfone sozinho quando a Aura termina de falar (como no filme 'Her').
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            id="checkbox-hands-free"
            type="checkbox"
            checked={isHandsFree}
            onChange={(e) => onHandsFreeChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-checked:after:bg-white" />
        </label>
      </div>
    </div>
  );
};
