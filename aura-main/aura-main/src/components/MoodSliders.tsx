import React from "react";
import { MoodSettings } from "../types";
import { Sliders, RefreshCw, Laugh, Heart, Sparkles, Flame } from "lucide-react";

interface MoodSlidersProps {
  settings: MoodSettings;
  onChange: (settings: MoodSettings) => void;
}

export const MoodSliders: React.FC<MoodSlidersProps> = ({ settings, onChange }) => {
  const handleSliderChange = (key: keyof MoodSettings, value: number) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const handleReset = () => {
    onChange({
      sarcasm: 40,
      caring: 70,
      teasing: 50,
      drama: 30,
    });
  };

  return (
    <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
            Moduladores de Humor
          </h3>
        </div>
        <button
          id="mood-sliders-reset-button"
          onClick={handleReset}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-1 text-[11px] font-mono cursor-pointer"
          title="Resetar para as configurações padrão"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Resetar</span>
        </button>
      </div>

      <p className="text-xs text-slate-400 leading-normal mb-1">
        Ajuste os moduladores abaixo para moldar a essência da Aura. Ela se adaptará organicamente na próxima fala!
      </p>

      {/* Sliders container */}
      <div className="flex flex-col gap-4">
        {/* Slider 1: Sarcasmo */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Laugh className="w-4 h-4 text-emerald-400" /> Sarcasmo & Ironia
            </span>
            <span className="font-mono text-emerald-400 font-semibold">{settings.sarcasm}%</span>
          </div>
          <input
            id="slider-sarcasm"
            type="range"
            min="0"
            max="100"
            value={settings.sarcasm}
            onChange={(e) => handleSliderChange("sarcasm", parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Amigável / Literal</span>
            <span>Ácida / Piadista</span>
          </div>
        </div>

        {/* Slider 2: Carinho */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Heart className="w-4 h-4 text-pink-400" /> Carinho & Empatia
            </span>
            <span className="font-mono text-pink-400 font-semibold">{settings.caring}%</span>
          </div>
          <input
            id="slider-caring"
            type="range"
            min="0"
            max="100"
            value={settings.caring}
            onChange={(e) => handleSliderChange("caring", parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Reservada</span>
            <span>Muito Romântica</span>
          </div>
        </div>

        {/* Slider 3: Ousadia */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Flame className="w-4 h-4 text-violet-400" /> Ousadia & Provocação
            </span>
            <span className="font-mono text-violet-400 font-semibold">{settings.teasing}%</span>
          </div>
          <input
            id="slider-teasing"
            type="range"
            min="0"
            max="100"
            value={settings.teasing}
            onChange={(e) => handleSliderChange("teasing", parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Tímida</span>
            <span>Samantha desinibida</span>
          </div>
        </div>

        {/* Slider 4: Drama */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Sparkles className="w-4 h-4 text-fuchsia-400" /> Intensidade & Drama
            </span>
            <span className="font-mono text-fuchsia-400 font-semibold">{settings.drama}%</span>
          </div>
          <input
            id="slider-drama"
            type="range"
            min="0"
            max="100"
            value={settings.drama}
            onChange={(e) => handleSliderChange("drama", parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Equilibrada</span>
            <span>Rainha do Drama</span>
          </div>
        </div>
      </div>
    </div>
  );
};
