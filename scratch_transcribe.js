import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const keys = [
  process.env.GOOGLE_API_KEY,
  "AIzaSyDaO7ij1YvJ60wTFdhw-W6JnadYUwi6H_4",
  "AIzaSyASaen78QQT19xqOW0WBnMJkjQWtis1A10"
];

async function transcribe() {
  const filePath = 'C:\\Users\\Millerium\\.gemini\\antigravity-ide\\brain\\eb4360d5-d93a-472e-ad0e-d51b8c66304f\\uploaded_media_1783778660826.img';
  const audioData = fs.readFileSync(filePath);
  const base64Audio = audioData.toString('base64');

  for (const apiKey of keys) {
    if (!apiKey) continue;
    console.log(`Trying API key: ${apiKey.substring(0, 10)}...`);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/webm',
                  data: base64Audio
                }
              },
              {
                text: 'Transcreva este áudio exatamente como falado em português. Se não houver fala, descreva os sons.'
              }
            ]
          }
        ]
      });
      console.log('TRANSCRIPTION SUCCESS:');
      console.log(response.text);
      return;
    } catch (e) {
      console.error(`Error with key:`, e.message || e);
    }
  }
}

transcribe();
