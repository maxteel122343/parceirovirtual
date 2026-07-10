import { GoogleGenAI } from '@google/genai';

const apiKey = "AIzaSyASaen78QQT19xqOW0WBnMJkjQWtis1A10";

async function testGemini() {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                systemInstruction: "Diga oi"
            }
        });
        
        sessionPromise.then(session => {
            console.log("CONEXÃO BEM SUCEDIDA!");
            session.close();
            process.exit(0);
        }).catch(err => {
            console.error("ERRO AO CONECTAR:", err);
            process.exit(1);
        });
    } catch (e) {
        console.error("ERRO:", e);
    }
}

testGemini();
