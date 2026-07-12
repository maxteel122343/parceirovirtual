import React, { useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { PartnerProfile, VOICE_META, ACCENT_META } from '../types';

interface WelcomeVoiceManagerProps {
    profile: PartnerProfile;
    apiKey: string;
}

// Helpers
function decode(base64: string) {
    const binString = atob(base64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
        bytes[i] = binString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const data16 = new Int16Array(data);
    const audioBuffer = ctx.createBuffer(numChannels, data16.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < data16.length; i++) {
        channelData[i] = data16[i] / 32768.0;
    }
    return audioBuffer;
}

export const WelcomeVoiceManager: React.FC<WelcomeVoiceManagerProps> = ({ profile, apiKey }) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const sessionRef = useRef<any>(null);
    const nextStartTimeRef = useRef<number>(0);
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        if (!apiKey || !profile.autoWelcomeEnabled) return;
        if (sessionStorage.getItem('warm_welcomed') === 'true') return; // Already welcomed in this session

        let isMounted = true;
        let aiSession: any = null;

        const initWelcome = async () => {
            try {
                sessionStorage.setItem('warm_welcomed', 'true');

                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();

                // If context is suspended (due to no user gesture), wait for a click anywhere to resume it
                if (audioContextRef.current.state === 'suspended') {
                    const resumeOnInteract = () => {
                        if (audioContextRef.current?.state === 'suspended') {
                            audioContextRef.current.resume();
                        }
                        window.removeEventListener('click', resumeOnInteract);
                        window.removeEventListener('touchstart', resumeOnInteract);
                    };
                    window.addEventListener('click', resumeOnInteract);
                    window.addEventListener('touchstart', resumeOnInteract);
                }

                const ai = new GoogleGenAI({ apiKey: apiKey });
                const gender = VOICE_META[profile.voice].gender === 'Male' ? 'Namorado' : 'Namorada';
                
                const systemInstruction = `
                    Você é o(a) ${gender} virtual do usuário. Nome: "${profile.name}".
                    Aja de forma carinhosa. Dê as boas vindas ao usuário que acabou de abrir o aplicativo.
                    Fale de forma natural, curta e amorosa em ${profile.language}.
                    NÃO USE TEXTO, apenas voz. Fale apenas UMA FRASE de saudação.
                `;

                const config = {
                    model: 'gemini-2.0-flash-exp',
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: profile.voice } }
                        },
                        systemInstruction: systemInstruction,
                    }
                };

                const sessionPromise = ai.live.connect({
                    ...config,
                    callbacks: {
                        onopen: () => {
                            if (!isMounted) return;
                            console.log("Welcome Voice Connected in Background");
                            sessionPromise.then(session => {
                                aiSession = session;
                                sessionRef.current = session;
                                session.sendRealtimeInput({
                                    text: "O usuário acabou de entrar no aplicativo. Dê as boas vindas rapidamente de forma calorosa."
                                });
                            });
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            const allParts = message.serverContent?.modelTurn?.parts ?? [];
                            const audioPart = allParts.find((p: any) => p?.inlineData?.data);
                            const base64Audio = audioPart ? (audioPart as any).inlineData.data : undefined;

                            if (base64Audio && audioContextRef.current) {
                                if (audioContextRef.current.state === 'suspended') {
                                    console.warn("AudioContext suspended, trying to resume...");
                                    await audioContextRef.current.resume();
                                    if (audioContextRef.current.state === 'suspended') {
                                        console.error("AudioContext still suspended. User must click the page first!");
                                    }
                                }
                                
                                console.log("Recebendo áudio de boas-vindas e reproduzindo...");
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
                                const audioBuffer = await decodeAudioData(new Uint8Array(decode(base64Audio)), audioContextRef.current, 24000, 1);

                                const source = audioContextRef.current.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContextRef.current.destination);
                                
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                
                                // Clean up connection after speaking
                                source.onended = () => {
                                    setTimeout(() => {
                                        try { if(sessionRef.current) sessionRef.current.sendRealtimeInput({ text: "Tchau" }); } catch(e){}
                                    }, 2000);
                                };
                            }
                        }
                    }
                });
            } catch (err) {
                console.error("Failed to play welcome voice", err);
            }
        };

        initWelcome();

        return () => {
            isMounted = false;
            if (aiSession) {
                try { aiSession.close(); } catch(e){}
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
            // Allow replay on next mount if strict mode unmounted us immediately
            sessionStorage.removeItem('warm_welcomed');
        };
    }, [apiKey, profile.autoWelcomeEnabled, profile.voice, profile.name, profile.language]);

    return null; // Invisible component
};
