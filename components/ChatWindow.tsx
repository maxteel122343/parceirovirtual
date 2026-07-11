import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, ChatMessage } from '../types';
import { GeminiService, ChatMessage as AiChatMessage } from './services/geminiService';

interface ChatWindowProps {
    currentUser: any;
    targetProfile: UserProfile;
    isAi: boolean;
    onClose: () => void;
    theme: 'dark' | 'light' | 'pink';
    apiKey: string;
    chatApiKey?: string;
    chatModel?: string;
    ephemeralHumanChats?: boolean;
}

interface Conversation {
    profile: UserProfile;
    isAi: boolean;
    lastMessage?: string;
    lastMessageDate?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, targetProfile: initialTarget, isAi: initialIsAi, onClose, theme, apiKey, chatApiKey, chatModel, ephemeralHumanChats }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeTarget, setActiveTarget] = useState<UserProfile>(initialTarget);
    const [activeIsAi, setActiveIsAi] = useState(initialIsAi);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
        return localStorage.getItem("ai_chat_voice_enabled") === 'true';
    });
    const [isListening, setIsListening] = useState(false);

    const recognitionRef = useRef<any>(null);
    const isSpeakingRef = useRef<boolean>(false);
    const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = "pt-BR";

            rec.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            rec.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                if (text && text.trim().length > 0) {
                    setNewMessage(text);
                }
            };

            rec.onerror = (event: any) => {
                console.error("Erro no reconhecimento de fala:", event.error);
                setIsListening(false);
            };

            rec.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = rec;
        }

        return () => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    useEffect(() => {
        localStorage.setItem("ai_chat_voice_enabled", String(isVoiceEnabled));
        if (!isVoiceEnabled && typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, [isVoiceEnabled]);

    const isDark = theme === 'dark';
    const isPink = theme === 'pink';
    const cardClasses = isPink ? "bg-white border-[#ffdada] text-[#912d4a]" : isDark ? "bg-[#15181e] border-white/5 text-white" : "bg-white border-slate-100 text-slate-900";
    const inputClasses = isPink ? "bg-[#fffafa] border-[#ffc5ca] text-[#912d4a]" : isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900";

    const fetchMessages = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeTarget.id}),and(sender_id.eq.${activeTarget.id},receiver_id.eq.${currentUser.id})`)
            .eq('is_to_ai', activeIsAi)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
            // After fetching, if we have unread messages directed to us, mark them as read
            const unreadToMe = data.some(m => m.receiver_id === currentUser.id && !m.is_read);
            if (unreadToMe) {
                markAsRead();
            }
        }
        setLoading(false);
    };

    const markAsRead = async () => {
        if (!currentUser?.id || !activeTarget?.id) return;
        console.log(`Marcando mensagens de ${activeTarget.display_name} como lidas...`);
        await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('receiver_id', currentUser.id)
            .eq('sender_id', activeTarget.id)
            .eq('is_read', false);
    };

    const cleanupEphemeral = async (targetId: string, isAi: boolean) => {
        if (!ephemeralHumanChats || isAi) return;
        console.log(`Limpando chat efêmero com ${targetId}...`);
        await supabase
            .from('chat_messages')
            .delete()
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${currentUser.id})`)
            .eq('is_read', true);
    };

    const fetchConversations = async () => {
        setLoadingConversations(true);
        try {
            const { data: sentData } = await supabase
                .from('chat_messages')
                .select('receiver_id, is_to_ai')
                .eq('sender_id', currentUser.id);

            const { data: receivedData } = await supabase
                .from('chat_messages')
                .select('sender_id, is_to_ai')
                .eq('receiver_id', currentUser.id);

            const partnersSet = new Set<string>(); // Unique "id:isAi" strings
            sentData?.forEach(m => partnersSet.add(`${m.receiver_id}:${!!m.is_to_ai}`));
            receivedData?.forEach(m => partnersSet.add(`${m.sender_id}:${!!m.is_to_ai}`));

            const partnersList = Array.from(partnersSet).map(s => {
                const [id, isAi] = s.split(':');
                return { id, isAi: isAi === 'true' };
            });

            const partnerIds = Array.from(new Set(partnersList.map(p => p.id)));
            if (partnerIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', partnerIds);

                if (profiles) {
                    const profileMap = new Map((profiles as UserProfile[]).map(p => [p.id, p]));
                    const convs: Conversation[] = await Promise.all(partnersList.map(async (pItem) => {
                        const pProfile = profileMap.get(pItem.id);
                        if (!pProfile) return null;

                        const { data: lastMsg } = await supabase
                            .from('chat_messages')
                            .select('content, created_at')
                            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${pItem.id}),and(sender_id.eq.${pItem.id},receiver_id.eq.${currentUser.id})`)
                            .eq('is_to_ai', pItem.isAi)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        const c: Conversation = {
                            profile: pProfile,
                            isAi: pItem.isAi,
                            lastMessage: lastMsg?.content,
                            lastMessageDate: lastMsg?.created_at
                        };
                        return c;
                    })).then(results => results.filter((c): c is Conversation => c !== null));

                    // Sort by date
                    convs.sort((a, b) => {
                        const dateA = a.lastMessageDate || '0';
                        const dateB = b.lastMessageDate || '0';
                        return dateB.localeCompare(dateA);
                    });

                    if (!convs.find(c => c.profile.id === initialTarget.id && c.isAi === initialIsAi)) {
                        convs.unshift({ profile: initialTarget, isAi: initialIsAi });
                    }
                    setConversations(convs);
                }
            } else {
                setConversations([{ profile: initialTarget, isAi: initialIsAi }]);
            }
        } catch (err) {
            console.error("Error fetching conversations:", err);
        } finally {
            setLoadingConversations(false);
        }
    };

    useEffect(() => {
        if (!currentUser?.id || !activeTarget?.id) return;

        fetchMessages();

        const channel = supabase.channel(`chat_sync_${currentUser.id}_${activeTarget.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `receiver_id=eq.${currentUser.id}`
            }, (payload) => {
                const newMsg = payload.new as ChatMessage;
                if (newMsg.sender_id === activeTarget.id && !!newMsg.is_to_ai === activeIsAi) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                    // Mark as read immediately when receiving while active
                    markAsRead();
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `sender_id=eq.${currentUser.id}`
            }, (payload) => {
                const newMsg = payload.new as ChatMessage;
                if (newMsg.receiver_id === activeTarget.id && !!newMsg.is_to_ai === activeIsAi) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            // When leaving this target, cleanup if ephemeral
            cleanupEphemeral(activeTarget.id, activeIsAi);
        };
    }, [activeTarget.id, currentUser?.id]);

    useEffect(() => {
        fetchConversations();

        // Listen for new messages to refresh the conversation list (new partners)
        const channel = supabase.channel('chat_window_conv_sync')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages'
            }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isAiTyping, error]);

    const handleAiResponse = async (userMsg: string, currentHistory: ChatMessage[]) => {
        const finalKey = (chatApiKey || apiKey || "").trim();
        const finalModel = chatModel || 'gemini-2.0-flash';

        if (!finalKey) {
            setError("Chave API do Gemini não configurada.");
            return;
        }

        setIsAiTyping(true);
        try {
            console.log(`Chamando Gemini Service (${finalModel}) via SDK...`);

            const service = new GeminiService({
                model: finalModel,
                apiKey: finalKey
            });

            const systemInstruction = `Você é uma inteligência artificial prestativa no chat.
                O usuário está falando com você via chat. 
                Responda como se estivesse em um chat de texto (WhatsApp/Telegram). 
                Seja extremamente breve, direto e natural. Use emojis.
                
                ATENÇÃO (DINÂMICA DE RESPOSTA):
                - Sempre comece demonstrando escuta ativa: repita ou interprete brevemente o que o usuário acabou de falar em tom reflexivo ou de pergunta (ex: "Então você acha que...", "Hum, quer dizer que...", "Entendi, você está dizendo que...").
                - Logo em seguida na mesma resposta, dê a sua opinião/resposta de forma ultra-breve.
                - Mantenha a resposta toda super curta (máximo 1-2 frases curtas, idealmente menos de 15 palavras) para manter a resposta ultra-rápida (menos de 800ms).`;

            const history: AiChatMessage[] = currentHistory.slice(0, -1).slice(-4).map(m => ({
                role: m.sender_id === currentUser.id ? 'user' : 'model',
                content: m.content
            }));

            // Adiciona mensagem vazia da IA para o streaming
            setMessages(prev => [...prev, {
                id: 'typing-' + Date.now(),
                sender_id: activeTarget.id,
                receiver_id: currentUser.id,
                content: '',
                is_to_ai: false,
                created_at: new Date().toISOString(),
                is_read: true
            }]);

            const stream = service.sendMessageStream(userMsg, history, systemInstruction);
            let assistantContent = '';

            for await (const chunk of stream) {
                assistantContent += chunk;
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.id.startsWith('typing-')) {
                        lastMsg.content = assistantContent;
                    }
                    return newMessages;
                });
            }

            if (isVoiceEnabled) {
                speakText(assistantContent);
            }

            // Após terminar o streaming, salva a mensagem completa no Supabase
            const { error: saveError } = await supabase.from('chat_messages').insert({
                sender_id: activeTarget.id,
                receiver_id: currentUser.id,
                content: assistantContent,
                is_to_ai: false,
                is_read: false
            });

            if (saveError) console.error("Error saving AI response:", saveError);

        } catch (error: any) {
            console.error("AI Error:", error);
            let userFriendlyError = error.message || "Tente novamente.";

            if (userFriendlyError.includes("exceeded your current quota") || userFriendlyError.includes("limit: 0")) {
                userFriendlyError = `O modelo '${finalModel}' atingiu o limite de uso do Google (Quota Exceeded). DICA: Tente selecionar outro modelo nas configurações do Chat para continuar.`;
            } else if (userFriendlyError.includes("API key not valid")) {
                userFriendlyError = "Chave API inválida. Verifique sua chave nas configurações.";
            }

            setError("Erro na IA: " + userFriendlyError);

            // Remove a mensagem de typing em caso de erro
            setMessages(prev => prev.filter(m => !m.id.startsWith('typing-')));
        } finally {
            setIsAiTyping(false);
        }
    };

    const speakText = (text: string) => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        isSpeakingRef.current = true;

        // Limpa formatação markdown e colchetes de legenda da IA
        const cleanText = text
            .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "")
            .replace(/haha|hihi|hehe|kkk/gi, "haha")
            .replace(/^\[\[LEGENDA:\s*([\s\S]*?)(?:\]\]|$)/i, "$1")
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "pt-BR";

        // Procura vozes compatíveis no navegador
        const voices = window.speechSynthesis.getVoices();
        const targetVoiceName = activeTarget.ai_settings?.voice;
        let selectedVoice = voices.find(v => v.lang.startsWith("pt") && (v.name.includes("Google") || v.name.includes("Samantha")));

        if (targetVoiceName) {
            const matching = voices.find(v => v.name.toLowerCase().includes(targetVoiceName.toLowerCase()));
            if (matching) selectedVoice = matching;
        }

        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith("pt") || v.lang.includes("PT"));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.pitch = 1.0;
        utterance.rate = 1.0;

        (window as any)._chatUtterance = utterance;

        let fallbackTimer: any = null;
        const handleSpeechFinished = () => {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            isSpeakingRef.current = false;
        };

        utterance.onstart = () => {
            isSpeakingRef.current = true;
        };

        utterance.onend = () => {
            handleSpeechFinished();
        };

        utterance.onerror = () => {
            handleSpeechFinished();
        };

        const words = cleanText.split(/\s+/).length;
        const estimatedTimeMs = (words / 1.5) * 1000 + 4000;
        fallbackTimer = setTimeout(() => {
            if (isSpeakingRef.current && (window as any)._chatUtterance === utterance) {
                handleSpeechFinished();
            }
        }, estimatedTimeMs);

        speechUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const handleToggleListening = async () => {
        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
        } else {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    if (recognitionRef.current) {
                        recognitionRef.current.start();
                    }
                } catch (err) {
                    console.error("Microphone permission denied:", err);
                    setError("Permissão de microfone negada pelo navegador.");
                }
            } else if (recognitionRef.current) {
                recognitionRef.current.start();
            }
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msgContent = newMessage;
        setNewMessage('');
        setError(null);

        const { data: sentMsg, error: insertError } = await supabase
            .from('chat_messages')
            .insert({
                sender_id: currentUser.id,
                receiver_id: activeTarget.id,
                content: msgContent,
                is_to_ai: activeIsAi
            })
            .select()
            .single();

        if (insertError) {
            console.error("Erro ao enviar mensagem:", insertError);
            setError("Erro ao enviar mensagem. Verifique sua conexão.");
            return;
        }

        if (sentMsg) {
            setMessages(prev => [...prev, sentMsg]);
            // Trigger AI response if talking to AI OR if receiver has AI Chat Intercept enabled
            const receiverAiSettings = activeTarget.ai_settings as any;
            const isInterceptEnabled = receiverAiSettings?.isAiChatInterceptEnabled === true;

            if (activeIsAi || isInterceptEnabled) {
                handleAiResponse(msgContent, [...messages, sentMsg]);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black backdrop-blur-3xl flex flex-col sm:flex-row animate-in fade-in duration-300">
            {/* Sidebar */}
            <div className={`w-full sm:w-80 h-16 sm:h-full border-b sm:border-b-0 sm:border-r border-white/5 flex flex-col ${cardClasses} z-10 shadow-2xl overflow-hidden`}>
                <div className="p-6 border-b border-inherit bg-black/5 flex items-center justify-between">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">Chats</h2>
                    <button onClick={onClose} className="sm:hidden text-xl opacity-50">✕</button>
                    <button onClick={onClose} className="hidden sm:block text-[10px] font-black uppercase tracking-widest opacity-30">Fechar</button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar flex sm:flex-col p-2 sm:p-4 gap-2">
                    {conversations.map((conv) => (
                        <div
                            key={conv.profile.id}
                            onClick={() => { setActiveTarget(conv.profile); setActiveIsAi(conv.isAi); }}
                            className={`flex items-center gap-4 p-4 rounded-[1.5rem] cursor-pointer transition-all shrink-0 sm:shrink ${activeTarget.id === conv.profile.id
                                ? 'bg-blue-600 text-white'
                                : isPink ? 'hover:bg-pink-50 text-[#912d4a]/60' : isDark ? 'hover:bg-white/5 text-white/60' : 'hover:bg-slate-50 text-slate-800'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shrink-0">
                                {conv.isAi ? (
                                    conv.profile.ai_settings?.image ? <img src={conv.profile.ai_settings.image} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-pink-500/10 flex items-center justify-center">⚡</div>
                                ) : (
                                    conv.profile.avatar_url ? <img src={conv.profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-500/10 flex items-center justify-center font-bold">👤</div>
                                )}
                            </div>
                            <div className="hidden sm:block flex-1 min-w-0">
                                <p className="font-bold text-[14px] italic uppercase tracking-tighter truncate">{conv.isAi ? (conv.profile.ai_settings?.name || conv.profile.display_name) : conv.profile.display_name}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{conv.isAi ? 'IA Partner' : 'Humano'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Area */}
            <div className={`flex-1 flex flex-col h-full ${isPink ? 'bg-[#fffafa]' : isDark ? 'bg-[#0f1116]' : 'bg-slate-50'}`}>
                <div className={`p-6 border-b border-white/5 flex items-center justify-between ${cardClasses}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl overflow-hidden shadow-lg ${activeIsAi ? 'ring-2 ring-pink-500' : 'ring-2 ring-blue-500'}`}>
                            {activeIsAi ? (
                                activeTarget.ai_settings?.image ? <img src={activeTarget.ai_settings.image} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-pink-500/10 flex items-center justify-center">⚡</div>
                            ) : (
                                activeTarget.avatar_url ? <img src={activeTarget.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-500/10 flex items-center justify-center font-bold">👤</div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-black italic uppercase tracking-tighter text-lg">{activeIsAi ? (activeTarget.ai_settings?.name || activeTarget.display_name) : activeTarget.display_name}</h3>
                            <div className="flex items-center gap-1.5 pt-0.5">
                                <div className={`w-2 h-2 rounded-full ${isAiTyping ? 'bg-pink-500 animate-pulse' : 'bg-emerald-500'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{isAiTyping ? 'Digitando...' : 'Online'}</span>
                            </div>
                        </div>
                    </div>
                    {/* Botão fechar para Mobile / Conveniência */}
                    {/* Botão de voz e fechar */}
                    <div className="flex items-center gap-2">
                        {activeIsAi && (
                            <button
                                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                className={`p-3 rounded-xl transition-all ${isVoiceEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'}`}
                                title={isVoiceEnabled ? "Desativar voz da IA" : "Ativar voz da IA"}
                            >
                                {isVoiceEnabled ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <line x1="23" y1="9" x2="17" y2="15"></line>
                                        <line x1="17" y1="9" x2="23" y2="15"></line>
                                    </svg>
                                )}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-3 bg-black/5 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === currentUser.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                <div className={`max-w-[75%] p-5 rounded-3xl ${isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-xl shadow-blue-500/20' : (isPink ? 'bg-pink-100 text-[#912d4a]' : isDark ? 'bg-white/10 text-white' : 'bg-white shadow-md text-slate-800') + ' rounded-tl-none'} group relative`}>
                                    <p className="text-[15px] font-medium leading-relaxed">{msg.content}</p>
                                    <div className="flex items-center justify-between mt-2 gap-4">
                                        <div className="text-[9px] font-black uppercase tracking-widest opacity-40">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {!isMe && activeIsAi && (
                                            <button
                                                onClick={() => speakText(msg.content)}
                                                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 text-inherit"
                                                title="Ouvir mensagem"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {isAiTyping && (
                        <div className="flex justify-start">
                            <div className={`p-5 rounded-3xl rounded-tl-none ${isPink ? 'bg-pink-100 text-pink-600' : isDark ? 'bg-white/10 text-white' : 'bg-white shadow-md'}`}>
                                <div className="flex gap-1.5 py-1">
                                    <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="flex justify-center p-4">
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl">{error}</div>
                        </div>
                    )}
                </div>

                <div className="p-6 sm:p-10 border-t border-white/5 bg-black/5">
                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-4 items-center">
                        <button
                            type="button"
                            onClick={handleToggleListening}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'}`}
                            title={isListening ? "Parar de ouvir" : "Falar mensagem"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        </button>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isListening ? "Ouvindo... fale agora." : "ESCREVER MENSAGEM..."}
                            className={`flex-1 p-6 rounded-[2rem] border text-sm font-bold focus:outline-none transition-all ${inputClasses}`}
                        />
                        <button type="submit" disabled={!newMessage.trim() || isAiTyping} className="w-20 h-20 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shrink-0">
                            <svg className="h-8 w-8 rotate-90" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
