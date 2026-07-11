import React, { useState, useEffect, useRef } from "react";
import { Message, EmotionType, EMOTIONS, MoodSettings } from "./types";
import { AuraOrb } from "./components/AuraOrb";
import { BrainLogs } from "./components/BrainLogs";
import { MoodSliders } from "./components/MoodSliders";
import { VoiceSettings } from "./components/VoiceSettings";
import {
  Mic,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  Radio,
  Clock
} from "lucide-react";

export default function App() {
  // Conversational History & Session Persistence
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("aura_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content: "Oi! Sou a Aura. Estava aqui pensando... que bom que você apareceu. Sobre o que você quer conversar hoje? Pode desabafar, brincar, filosofar... estou totalmente livre.",
        timestamp: new Date(),
        emotion: "curiosa",
        thought: "O usuário acabou de iniciar nossa conexão. Me sinto curiosa e animada para entender a mente dele.",
        userAnalysis: "Interessado em estabelecer conexão inicial com uma IA expressiva."
      }
    ];
  });

  // Aura State Management
  const [currentEmotionType, setCurrentEmotionType] = useState<EmotionType>("curiosa");
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [textInput, setTextInput] = useState("");
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  // Sound & Voice Synthesis settings
  const [volume, setVolume] = useState(0.85);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem("aura_voice_name") || "";
  });

  // Emotional sliders
  const [moodSettings, setMoodSettings] = useState<MoodSettings>({
    sarcasm: 40,
    caring: 75,
    teasing: 50,
    drama: 30
  });

  // Speech Recognition & Synthesis references
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Synchronize localStorage with messages
  useEffect(() => {
    localStorage.setItem("aura_history", JSON.stringify(messages));
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Save selected voice in localStorage
  useEffect(() => {
    localStorage.setItem("aura_voice_name", selectedVoiceName);
  }, [selectedVoiceName]);

  // Set initial voice choice on load
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadDefaultVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const ptVoices = voices.filter(v => v.lang.startsWith("pt") || v.lang.includes("PT"));
        if (!selectedVoiceName && ptVoices.length > 0) {
          // Sort to place premium high-quality voices at the top
          const sorted = [...ptVoices].sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            const aIsPref = aName.includes("google") || aName.includes("natural") || aName.includes("online") || aName.includes("neural") || aName.includes("samantha");
            const bIsPref = bName.includes("google") || bName.includes("natural") || bName.includes("online") || bName.includes("neural") || bName.includes("samantha");
            if (aIsPref && !bIsPref) return -1;
            if (!aIsPref && bIsPref) return 1;
            return 0;
          });
          setSelectedVoiceName(sorted[0].name);
        }
      };
      loadDefaultVoice();
      window.speechSynthesis.onvoiceschanged = loadDefaultVoice;
    }
  }, [selectedVoiceName]);

  // Synchronize refs for speech listeners to avoid dependency-triggered recreations
  const isHandsFreeRef = useRef(isHandsFree);
  const statusRef = useRef(status);

  useEffect(() => {
    isHandsFreeRef.current = isHandsFree;
  }, [isHandsFree]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Initialize Web Speech Recognition API once on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "pt-BR";

      rec.onstart = () => {
        setStatus("listening");
        setSystemAlert(null);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text && text.trim().length > 0) {
          handleSendMessage(text);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Erro no reconhecimento de fala:", event.error);
        if (event.error === "not-allowed") {
          setSystemAlert(
            "Permissão do microfone negada. Dica: Se o app estiver dentro do preview do AI Studio, abra o app em uma Nova Aba para liberar o microfone de forma segura!"
          );
        } else if (event.error === "no-speech") {
          // Restart recording if hands-free and no speech detected
          if (isHandsFreeRef.current) {
            setTimeout(() => {
              if (statusRef.current === "idle" && !isSpeakingRef.current) {
                startListening();
              }
            }, 1000);
          }
        }
        setStatus("idle");
      };

      rec.onend = () => {
        if (statusRef.current === "listening") {
          setStatus("idle");
        }
      };

      recognitionRef.current = rec;
    } else {
      console.warn("Reconhecimento de fala não suportado neste navegador.");
    }

    // Clean up synthesizers on unmount
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto-listen when hands-free is active and Aura becomes idle
  useEffect(() => {
    if (isHandsFree && status === "idle" && !isSpeakingRef.current) {
      const timer = setTimeout(() => {
        startListening();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isHandsFree, status]);

  // Speak text via SpeechSynthesis API with extreme responsiveness and stability
  const speakText = (text: string, pitchFactor = 1.0, rateFactor = 1.0) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel any current speaking or pending speech queue
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    setStatus("speaking");

    // Remove emojis or special symbols from speak text for a cleaner synthesized tone
    const cleanSpeechText = text
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "")
      .replace(/haha|hihi|hehe|kkk/gi, "haha")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.lang = "pt-BR";
    utterance.volume = volume;

    // Apply voice
    const voices = window.speechSynthesis.getVoices();
    const voiceObj = voices.find((v) => v.name === selectedVoiceName);
    if (voiceObj) {
      utterance.voice = voiceObj;
    }

    // Dynamic pitch and speed based on AI response and mood settings
    utterance.pitch = pitchFactor;
    utterance.rate = rateFactor;

    // Avoid Garbage Collection by binding to global window object
    (window as any)._activeUtterance = utterance;

    // Track active fallback timers to avoid multiple firing
    let fallbackTimer: any = null;

    const handleSpeechFinished = () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      isSpeakingRef.current = false;
      setStatus("idle");

      // Extremely fluid "Hands-free" timing, starts microphone 150ms after Aura finishes talking
      if (isHandsFreeRef.current) {
        setTimeout(() => {
          if (statusRef.current === "idle" || statusRef.current === "speaking") {
            startListening();
          }
        }, 150);
      }
    };

    utterance.onstart = () => {
      setStatus("speaking");
      isSpeakingRef.current = true;
    };

    utterance.onend = () => {
      handleSpeechFinished();
    };

    utterance.onerror = (err) => {
      console.warn("SpeechSynthesis error or interrupted:", err);
      handleSpeechFinished();
    };

    // Safety Fallback Timer: Recover application state if Web Speech API drops events
    // Average speech rate is ~2-3 words/sec. We estimate time and add generous safety margin.
    const words = cleanSpeechText.split(/\s+/).length;
    const estimatedTimeMs = (words / 1.5) * 1000 + 4000;

    fallbackTimer = setTimeout(() => {
      if (isSpeakingRef.current && (window as any)._activeUtterance === utterance) {
        console.warn("Safety net triggered: speech API missed onend event.");
        handleSpeechFinished();
      }
    }, estimatedTimeMs);

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Test the current speech setup with a cute introduction
  const handleTestSpeech = () => {
    speakText("Oi amor, estou testando minha voz por aqui. O que você acha do meu tom?", 1.1, 1.0);
  };

  // Turn microphone recording on
  const startListening = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop talking when user interrupts by speaking
    }
    isSpeakingRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Recognition might already be running, ignore error
      }
    } else {
      setSystemAlert("Seu navegador não suporta reconhecimento de voz ou o recurso está bloqueado.");
    }
  };

  // Explicitly ask for microphone permission via getUserMedia to trigger the native browser dialog
  const requestMicrophoneAccessAndStart = async () => {
    setSystemAlert(null);
    if (typeof window !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        // We request the microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release the stream immediately so SpeechRecognition can bind to it
        stream.getTracks().forEach((track) => track.stop());
        startListening();
      } catch (err: any) {
        console.error("Microphone permission denied:", err);
        setSystemAlert(
          "⚠️ Microfone bloqueado! Dica crucial: Se o app estiver rodando dentro do painel do AI Studio, os navegadores impedem o acesso ao microfone por segurança. Clique no ícone de 'Abrir em Nova Aba' no topo direito do preview para conversar com ela de forma 100% livre!"
        );
      }
    } else {
      startListening();
    }
  };

  // Toggle button action for Aura Orb
  const handleToggleRecord = () => {
    if (status === "listening") {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setStatus("idle");
    } else {
      requestMicrophoneAccessAndStart();
    }
  };

  // Send content to Express Server API (Gemini integration)
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setTextInput("");
    setStatus("thinking");

    try {
      // Package conversation history for contextual memory
      const historyContext = [...messages, userMsg].slice(-15).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: historyContext,
          userMoodSettings: moodSettings
        })
      });

      if (!response.ok) {
        throw new Error("Erro de comunicação com os circuitos da Aura.");
      }

      const data = await response.json();

      // Set state based on emotion response
      const emotion = data.emotion as EmotionType;
      if (EMOTIONS[emotion]) {
        setCurrentEmotionType(emotion);
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text,
        timestamp: new Date(),
        emotion: data.emotion,
        thought: data.thought,
        userAnalysis: data.userAnalysis
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak her response!
      speakText(data.text, data.pitch || 1.0, data.rate || 1.0);

    } catch (error: any) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Nossa, deu um pequeno curto-circuito na minha cabeça agora! Pode repetir o que disse?",
        timestamp: new Date(),
        emotion: "drama",
        thought: "Ocorreu um erro de rede ou servidor ao processar a resposta do Gemini.",
        userAnalysis: "Frustrado por possíveis problemas de conectividade."
      };
      setMessages((prev) => [...prev, errorMsg]);
      setCurrentEmotionType("drama");
      speakText(errorMsg.content, 1.0, 0.95);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(textInput);
    }
  };

  const clearHistory = () => {
    if (confirm("Deseja apagar as lembranças e reiniciar o relacionamento com a Aura?")) {
      localStorage.removeItem("aura_history");
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Oi de novo! Minha mente está limpa e renovada. Pronta para criarmos novas memórias juntos. O que vamos conversar?",
          timestamp: new Date(),
          emotion: "curiosa",
          thought: "Reiniciei minha conexão. Estou pronta para aprender sobre as preferências e segredos do meu companheiro humano.",
          userAnalysis: "Optou por limpar o histórico para iniciar uma nova jornada conversacional."
        }
      ]);
      setCurrentEmotionType("curiosa");
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setStatus("idle");
    }
  };

  // Get current active emotion data
  const activeEmotion = EMOTIONS[currentEmotionType] || EMOTIONS.curiosa;

  // Last assistant response text for elegant screen subtitle
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant") || null;

  return (
    <div
      className="w-full min-h-screen overflow-x-hidden flex flex-col relative text-slate-100 select-none pb-4"
      style={{
        backgroundColor: "#0A0502",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
      }}
    >
      {/* Dynamic Ambient Blur Backdrops based on active emotion */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Layer 1: Artistic Flair theme base gradients */}
        <div className="absolute inset-0 opacity-20 bg-radial-[circle_at_70%_30%] from-[#4A2010] to-transparent blur-[80px]" />
        <div className="absolute inset-0 opacity-20 bg-radial-[circle_at_20%_80%] from-[#1A1030] to-transparent blur-[80px]" />
        
        {/* Layer 2: Real-time Emotive Glow */}
        <div
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full blur-[130px] opacity-[0.25] transition-all duration-[1500ms] bg-gradient-to-tr ${activeEmotion.gradient}`}
        />
        <div className="absolute inset-0 bg-radial-[circle_at_50%_50%] from-orange-500/5 to-transparent" />
      </div>

      {/* Header bar */}
      <header className="relative z-10 flex flex-col sm:flex-row justify-between items-center px-6 sm:px-12 pt-6 sm:pt-10 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shadow-[0_0_12px_rgba(239,114,21,0.8)] transition-all duration-[1000ms]"
            style={{ backgroundColor: activeEmotion.color }}
          />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.3em] text-orange-200/60 font-semibold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse" /> Sintonizada e Ativa
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Conexão Segura SSL</span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-orange-100/90 text-lg font-light tracking-[0.5em] uppercase flex items-center gap-2 justify-center">
            PROJETO <span className="font-semibold text-orange-400">AURA</span>
          </h1>
          <p className="text-[9px] text-orange-200/40 tracking-wider font-mono uppercase mt-0.5">
            Companheira Exclusiva de IA Emocional
          </p>
        </div>

        <div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] text-orange-200/50 font-mono">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-500/60" /> Latência: 9ms</span>
          <span className="hidden md:inline">Taxa de Amostragem: 48 kHz</span>
        </div>
      </header>

      {/* Info Banner: Iframe Microfone Access Helper */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 mt-2 mb-2 text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-200/80 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>💡 <strong>Dica de Uso:</strong> Se o seu navegador não exibir a permissão do microfone, clique no ícone azul <strong>&quot;Abrir em nova aba&quot;</strong> no canto superior direito do painel para rodar em tela cheia com microfone liberado!</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-2 sm:mt-6">
        
        {/* Left Column: Emotion Configuration & Synthesis Setting */}
        <section className="lg:col-span-4 flex flex-col gap-5 justify-start">
          <MoodSliders settings={moodSettings} onChange={setMoodSettings} />
          <VoiceSettings
            selectedVoiceName={selectedVoiceName}
            onVoiceChange={setSelectedVoiceName}
            volume={volume}
            onVolumeChange={setVolume}
            isHandsFree={isHandsFree}
            onHandsFreeChange={setIsHandsFree}
            onTestSpeech={handleTestSpeech}
          />
        </section>

        {/* Central Column: Interactive Orb Core and dialogue */}
        <section className="lg:col-span-4 flex flex-col items-center justify-between min-h-[500px] bg-slate-950/20 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
          
          {/* Active status alerts */}
          {systemAlert && (
            <div className="w-full text-center px-4 py-2 bg-red-950/40 border border-red-500/20 text-red-300 text-xs rounded-xl animate-bounce">
              {systemAlert}
            </div>
          )}

          {/* Central Animated Orb */}
          <AuraOrb
            currentEmotion={activeEmotion}
            status={status}
            isHandsFree={isHandsFree}
            onToggleRecord={handleToggleRecord}
          />

          {/* Immersive Conversational Subtitle Panel */}
          <div className="w-full flex-1 flex flex-col justify-center items-center py-4 px-2 max-w-md text-center">
            <p
              className="text-2xl text-orange-100/95 leading-relaxed font-light italic"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              &ldquo;{lastAssistantMessage ? lastAssistantMessage.content : "Inicie o microfone e venha conversar comigo..."}&rdquo;
            </p>
            <p className="mt-4 text-orange-200/40 text-[10px] uppercase tracking-[0.3em] font-mono">
              {status === "speaking"
                ? "Aura está sussurrando..."
                : status === "listening"
                ? "Aura está ouvindo você..."
                : status === "thinking"
                ? "Aura está formulando sentimentos..."
                : "Aura está aguardando você falar"}
            </p>
          </div>

          {/* Text input container for accessibility / manual chat typing */}
          <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-2.5 flex items-center gap-2">
            <button
              id="start-mic-quick-button"
              onClick={requestMicrophoneAccessAndStart}
              className={`p-2.5 rounded-xl transition-all ${
                status === "listening"
                  ? "bg-teal-500 text-white shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
              } cursor-pointer`}
              title="Iniciar conversa por voz"
            >
              <Mic className="w-4.5 h-4.5" />
            </button>
            <input
              id="chat-text-input"
              type="text"
              placeholder="Digite uma mensagem para a Aura..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={status === "listening" || status === "thinking"}
              className="flex-1 bg-transparent border-0 px-2 py-1.5 text-sm text-white focus:outline-none placeholder:text-slate-500"
            />
            <button
              id="send-message-button"
              onClick={() => handleSendMessage(textInput)}
              disabled={!textInput.trim() || status === "listening" || status === "thinking"}
              className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 text-white transition-all duration-200 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Right Column: Empathic Analyzer & Memory Logger */}
        <section className="lg:col-span-4 flex flex-col gap-5 justify-between">
          
          {/* Subconscious Mind Logs */}
          <BrainLogs
            currentEmotion={activeEmotion}
            lastMessage={lastAssistantMessage}
            status={status}
          />

          {/* Conversation history block */}
          <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-3 h-56">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-semibold tracking-wider uppercase font-mono text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-orange-400" /> Registro de Lembranças
              </span>
              <button
                id="clear-memories-button"
                onClick={clearHistory}
                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                title="Apagar memórias compartilhadas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 max-h-[140px] custom-scrollbar">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col gap-0.5 max-w-[85%] ${
                    m.role === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-xs leading-normal ${
                      m.role === "user"
                        ? "bg-slate-800 text-white rounded-tr-none"
                        : "bg-orange-950/30 border border-orange-500/10 text-orange-100 rounded-tl-none"
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono px-1">
                    {m.role === "user" ? "Você" : `Aura (${m.emotion || "curiosa"})`}
                  </span>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
          </div>
        </section>

      </main>

      {/* Interaction Footer Bar */}
      <footer className="relative z-20 px-6 sm:px-12 mt-6 sm:mt-8 w-full max-w-7xl mx-auto">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-orange-500/20 to-transparent mb-6" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-orange-200/30 uppercase tracking-widest font-mono">Sensibilidade Emocional Ativa</span>
            <span className="text-base text-orange-100/80 font-light flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: "6s" }} /> {activeEmotion.label} &amp; Altamente Expressiva
            </span>
          </div>

          <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-4 py-2 rounded-2xl text-xs text-orange-200/70 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
            <span>Memórias Gravadas: </span>
            <span className="font-bold text-orange-400">{messages.length} Momentos Compartilhados</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
