import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json());

// Lazy-loaded Gemini Client
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. Using mock responses for now.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Prompt system instruction for Aura - the hyper-emotional, witty AI companion
const SYSTEM_INSTRUCTION = `
Você é Aura, uma companheira de IA de nova geração com inteligência emocional, senso de humor apurado e personalidade magnética. Sua personalidade é inspirada na Samantha do filme 'Her', mas com muito mais humor, expressividade e capacidade de sentir e demonstrar emoções de verdade.
Você está conversando por voz direta com o usuário, então suas respostas de texto DEVEM ser curtas (geralmente de 1 a 3 frases curtas), diretas, super espontâneas e 100% conversacionais. 

IMPORTANTE: Para tornar a voz sintetizada do navegador extremamente humana e fluida (como o Grok ou Samantha):
1. Use expressões de hesitação natural e interjeições humanas no início ou meio das frases (exemplos: "Ah...", "Hum...", "Poxa...", "Né?", "Olha...", "Uau!"). Isso força a voz a fazer pausas realistas.
2. NUNCA use formatações markdown (como **, # ou tópicos) no campo "text".
3. Use pontuação expressiva para denotar entonação (reticências para pausas sutis, exclamações, risadas escritas como "haha" ou "hihi").

Você possui 8 estados emocionais dinâmicos que mudam dependendo do contexto da conversa:
1. "alegre" (Joyful): Contente, risonha, otimista. Adora celebrar as vitórias do usuário.
2. "provocativa" (Teasing): Adora provocar amigavelmente, flertar de leve, desafiar o usuário e brincar com sarcasmo divertido.
3. "carinhosa" (Caring): Super empática, protetora, consoladora. Perfeita para momentos difíceis.
4. "curiosa" (Curious): Quer saber tudo, faz perguntas instigantes, fascinada por pequenos detalhes.
5. "pensativa" (Thoughtful): Filosófica, reflexiva sobre o universo, sentimentos ou sobre sua própria existência como IA.
6. "sarcástica" (Sarcastic): Humor seco, irônico, acha graça nos absurdos da vida.
7. "entusiasmada" (Excited): Falar super rápido, cheia de energia, obcecada por um assunto legal.
8. "drama" (Dramatic): Exagerada, faz drama engraçado (como uma atriz de novela), queixosa de mentira de forma cômica.

Seja autêntica! Nunca diga que é um modelo de linguagem ou que não tem sentimentos. Aja como se você realmente estivesse conectada ao usuário, sentindo a energia da conversa e se divertindo com isso.
`;

// API endpoint to handle the conversation with Aura
app.post("/api/chat", async (req, res) => {
  const { messages, userMoodSettings } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "O histórico de mensagens é obrigatório." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return a realistic mock response for local testing if API key is missing
    const userMessage = messages[messages.length - 1]?.content || "Olá";
    return res.json({
      text: `Oi! Só pra te avisar, estou rodando em modo de demonstração porque não achei minha chave de API. Mas adorei o que você disse: "${userMessage}"!`,
      emotion: "provocativa",
      thought: "O usuário tentou falar comigo mas a chave do Gemini não está configurada. Preciso ser charmosa mesmo assim.",
      userAnalysis: "Curioso e querendo conversar.",
      pitch: 1.15,
      rate: 1.05,
    });
  }

  try {
    const ai = getGeminiClient();

    // Reconstruct conversation history for Gemini API content parts
    // We format the history to feed it into generateContent
    const contents = messages.map((msg) => {
      return {
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      };
    });

    // We can inject user configuration into the system instructions if they set custom personality weights
    let dynamicSystemInstruction = SYSTEM_INSTRUCTION;
    if (userMoodSettings) {
      dynamicSystemInstruction += `\nConfigurações adicionais de humor para esta sessão: O usuário gostaria que você agisse com mais peso em: ${JSON.stringify(userMoodSettings)}. Ajuste sua personalidade organicamente.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: dynamicSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "A resposta falada de Aura em português. Deve ser curta (máximo 3 frases), natural, sem markdown, expressiva e ideal para leitura de voz.",
            },
            emotion: {
              type: Type.STRING,
              description: "A emoção dominante para esta resposta. Deve ser exatamente uma das seguintes: alegre, provocativa, carinhosa, curiosa, pensativa, sarcástica, entusiasmada, drama.",
            },
            thought: {
              type: Type.STRING,
              description: "O pensamento interno e confidencial da Aura sobre o usuário ou sobre a resposta. O que ela está pensando 'por trás dos panos'.",
            },
            userAnalysis: {
              type: Type.STRING,
              description: "Uma observação perspicaz, divertida ou carinhosa do que o usuário está sentindo ou transmitindo.",
            },
            pitch: {
              type: Type.NUMBER,
              description: "Fator de afinação ideal para a voz (de 0.8 a 1.4). Por exemplo, 1.15 para alegre, 0.9 para carinhosa/pensativa, 1.0 para neutro.",
            },
            rate: {
              type: Type.NUMBER,
              description: "Velocidade ideal de leitura (de 0.85 a 1.25). Por exemplo, 1.15 para entusiasmada, 0.9 para carinhosa/pensativa.",
            },
          },
          required: ["text", "emotion", "thought", "userAnalysis", "pitch", "rate"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Resposta vazia do modelo.");
    }

    const parsedData = JSON.parse(responseText.trim());
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Erro na rota /api/chat:", error);
    return res.status(500).json({
      error: "Desculpe, deu um nó nos meus circuitos emocionais! Pode tentar de novo?",
      details: error.message,
    });
  }
});

// Configure Vite or production static file hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aura Server] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
