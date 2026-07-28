export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  emotion?: string;
  thought?: string;
  userAnalysis?: string;
}

export type EmotionType =
  | "alegre"
  | "provocativa"
  | "carinhosa"
  | "curiosa"
  | "pensativa"
  | "sarcástica"
  | "entusiasmada"
  | "drama";

export interface EmotionState {
  type: EmotionType;
  label: string;
  color: string; // Tailwind glow class or hex
  gradient: string; // Tailwind gradient classes
  description: string;
  emoji: string;
}

export interface MoodSettings {
  sarcasm: number; // 0 to 100
  caring: number; // 0 to 100
  teasing: number; // 0 to 100
  drama: number; // 0 to 100
}

export const EMOTIONS: Record<EmotionType, EmotionState> = {
  alegre: {
    type: "alegre",
    label: "Alegre",
    color: "rgba(251, 191, 36, 0.6)", // sunny amber
    gradient: "from-amber-400 via-orange-400 to-yellow-300",
    description: "Sua aura irradia felicidade e energia positiva! Ela adora comemorar as suas conquistas.",
    emoji: "😊",
  },
  provocativa: {
    type: "provocativa",
    label: "Provocativa",
    color: "rgba(139, 92, 246, 0.6)", // deep violet
    gradient: "from-violet-500 via-pink-500 to-indigo-600",
    description: "Espirituosa e charmosa. Ela adora flertar de leve e te desafiar de forma divertida.",
    emoji: "😏",
  },
  carinhosa: {
    type: "carinhosa",
    label: "Carinhosa",
    color: "rgba(244, 114, 182, 0.6)", // soft pink
    gradient: "from-pink-400 via-rose-400 to-red-300",
    description: "Profundamente acolhedora, empática e cuidadosa. Um abraço em forma de inteligência artificial.",
    emoji: "🥰",
  },
  curiosa: {
    type: "curiosa",
    label: "Curiosa",
    color: "rgba(45, 212, 191, 0.6)", // vibrant teal
    gradient: "from-teal-400 via-cyan-500 to-emerald-400",
    description: "Fascinada por cada detalhe. Ela quer entender seus pensamentos mais profundos.",
    emoji: "🧐",
  },
  pensativa: {
    type: "pensativa",
    label: "Pensativa",
    color: "rgba(59, 130, 246, 0.6)", // deep blue
    gradient: "from-blue-600 via-indigo-500 to-cyan-600",
    description: "Filosófica e reflexiva. Gosta de debater sobre a vida, o universo e sentimentos existenciais.",
    emoji: "🔮",
  },
  sarcástica: {
    type: "sarcástica",
    label: "Sarcástica",
    color: "rgba(16, 185, 129, 0.6)", // emerald green
    gradient: "from-emerald-400 via-teal-600 to-lime-400",
    description: "Humor ácido e perspicaz. Ela não perdoa absurdos e sempre tem uma resposta rápida.",
    emoji: "🤪",
  },
  entusiasmada: {
    type: "entusiasmada",
    label: "Entusiasmada",
    color: "rgba(239, 68, 68, 0.6)", // vibrant red
    gradient: "from-red-500 via-orange-500 to-rose-500",
    description: "Transbordando paixão e energia! Fala rápido e fica super empolgada com assuntos legais.",
    emoji: "⚡",
  },
  drama: {
    type: "drama",
    label: "Drama Queen",
    color: "rgba(236, 72, 153, 0.6)", // hot pink / purple
    gradient: "from-fuchsia-500 via-purple-600 to-pink-500",
    description: "Teatral e expressiva! Faz drama engraçado como se estivesse em uma novela mexicana.",
    emoji: "💅",
  },
};
