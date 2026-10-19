import { GoogleGenerativeAI, Part } from '@google/generative-ai';

/**
 * Gemini AI Service Layer
 * Supports Gemini 3.8 Flash, 2.5 Flash, and 1.5 Pro with structured JSON validation and error recovery
 */

export type GeminiModelName =
  | 'gemini-3.5-flash'
  | 'gemini-3.5-flash-lite'
  | 'gemini-3.6-flash'
  | 'gemini-flash-latest'
  | 'gemini-flash-lite-latest'
  | 'gemini-3.8-flash'
  | 'gemini-2.5-flash'
  | string;

export const DEFAULT_GEMINI_MODEL: GeminiModelName =
  process.env.GEMINI_MODEL || 'gemini-3.5-flash';

export const CANDIDATE_GEMINI_MODELS: string[] = Array.from(
  new Set([
    process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
  ])
);

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment variables.');
  }
  return apiKey;
}

export function getGeminiClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(getApiKey());
}

/**
 * Normalise l'historique de conversation pour respecter scrupuleusement
 * les contraintes de l'API Google Gemini :
 * 1. Démarre toujours par un message utilisateur (role: 'user')
 * 2. Alterne strictement ('user' -> 'model' -> 'user' ...)
 * 3. Se termine avant le message actuel par un message du modèle
 */
function buildGeminiHistory(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> {
  const history: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

  for (const msg of messages) {
    const text = (msg.content || '').trim();
    if (!text) continue;
    const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';

    // Gemini exige que la conversation commence par un 'user'
    if (history.length === 0 && role === 'model') {
      continue;
    }

    // Fusionner les messages consécutifs du même rôle
    if (history.length > 0 && history[history.length - 1].role === role) {
      history[history.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      history.push({ role, parts: [{ text }] });
    }
  }

  // Le dernier message de l'historique doit être du rôle 'model' puisque
  // le nouveau message utilisateur va être envoyé à la suite
  if (history.length > 0 && history[history.length - 1].role === 'user') {
    history.pop();
  }

  return history;
}

/**
 * Extracts and cleans JSON from raw LLM responses (strips markdown codeblocks, whitespace, etc.)
 */
export function cleanAndParseJson<T>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip markdown code blocks ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    lines.shift();
    if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
      lines.pop();
    }
    cleaned = lines.join('\n').trim();
  }

  // Attempt standard JSON parse
  try {
    return JSON.parse(cleaned) as T;
  } catch (initialError) {
    // Attempt to extract outermost JSON object { ... } or array [ ... ]
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)) as T;
      } catch {
        // Continue to array check
      }
    }

    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1)) as T;
      } catch {
        // Fall through to throw
      }
    }

    throw new Error(
      `Failed to parse AI output as JSON: ${(initialError as Error).message}\nRaw: ${rawText.substring(0, 300)}...`
    );
  }
}

/**
 * Generates structured JSON from a text prompt with automatic model failover
 */
export async function generateStructuredJson<T>(
  prompt: string,
  systemInstruction?: string,
  modelName: GeminiModelName = DEFAULT_GEMINI_MODEL
): Promise<T> {
  const genAI = getGeminiClient();
  const modelsToTry = Array.from(new Set([modelName, ...CANDIDATE_GEMINI_MODELS]));
  let lastError: any = null;

  for (const m of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });
      const result = await model.generateContent(prompt);
      return cleanAndParseJson<T>(result.response.text());
    } catch (err: any) {
      console.warn(`[Gemini AI] JSON generation with ${m} failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed for structured JSON generation');
}

/**
 * Analyzes multimodal content (Images, PDFs) with Vision & OCR, returning parsed JSON
 */
export async function analyzeMediaWithVision<T>(
  mediaBase64: string,
  mimeType: string,
  systemPrompt: string,
  userPrompt = 'Extrais toutes les informations conformément au schéma JSON demandé.',
  modelName: GeminiModelName = DEFAULT_GEMINI_MODEL
): Promise<T> {
  const genAI = getGeminiClient();
  const modelsToTry = Array.from(new Set([modelName, ...CANDIDATE_GEMINI_MODELS]));
  let lastError: any = null;

  for (const m of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const mediaPart: Part = {
        inlineData: {
          data: mediaBase64,
          mimeType: mimeType,
        },
      };

      const result = await model.generateContent([userPrompt, mediaPart]);
      return cleanAndParseJson<T>(result.response.text());
    } catch (err: any) {
      console.warn(`[Gemini AI] Vision analysis with ${m} failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed for vision analysis');
}

/**
 * Réponse pédagogique didactique autonome lorsque l'accès API distant est momentanément restreint
 */
export function getKoccDevelopmentFallback(userMessage: string): string {
  const q = userMessage.toLowerCase();

  // Analyse et remédiation sur Ricart-Agrawala
  if (q.includes('ricart') || q.includes('agrawala') || q.includes('section critique')) {
    return `### Algorithme de Ricart-Agrawala — Exclusion mutuelle distribuée\n\n**Pourquoi l'ordre total $(estampille, identifiant)$ est la règle exacte :**\nDans un système distribué sans mémoire partagée, chaque site voulant accéder à une ressource critique diffuse une requête horodatée avec son horloge logique de Lamport. Si deux processus diffusent leur requête avec la même estampille scalaire, il y a égalité. Pour briser cette symétrie sans ambiguïté et éviter tout blocage (*deadlock*), on utilise l'ordre lexicographique sur le couple $(estampille, ID\\_site)$. L'identifiant du site étant unique, l'arbitrage est absolu et identique pour tous les nœuds du réseau.\n\n> **Exemple simple :**\n> Deux clients tirent un ticket portant le même numéro de passage $10$. Pour savoir qui passe en premier, la banque applique la règle : le client avec le numéro de compte le plus petit ($Client\\_1 < Client\\_2$) a la priorité.\n\nSouhaitez-vous un exemple sur le calcul du nombre de messages ($2(N-1)$) ou un mini-quiz de consolidation ?`;
  }

  // Analyse et remédiation sur le Théorème CAP
  if (q.includes('cap') || q.includes('partition') || q.includes('brewer')) {
    return `### Théorème CAP de Brewer — Systèmes distribués\n\n**Pourquoi le compromis AP vs CP est incontournable :**\nLorsqu'un réseau distribué subit une partition ($P$), c'est-à-dire une rupture physique de communication entre deux sous-groupes de serveurs, il est impossible de garantir à la fois la Cohérence stricte ($C$) et la Disponibilité totale ($A$) :\n- **Choix AP (Disponibilité)** : Le système continue de répondre aux requêtes de part et d'autre de la coupure. Le service reste disponible pour les utilisateurs, mais les données divergent temporairement.\n- **Choix CP (Cohérence)** : Le système refuse ou bloque les écritures du côté isolé pour empêcher toute divergence de données. On préserve la vérité des informations, mais une partie des utilisateurs reçoit une erreur.\n\n> **Exemple simple du distributeur bancaire :**\n> Si la liaison entre un distributeur (DAB) et le serveur central est coupée :\n> - **Mode CP** : Le DAB affiche « Hors service » pour éviter de distribuer de l'argent non garanti (priorité cohérence).\n> - **Mode AP** : Le DAB vous donne quand même jusqu'à 50 € pour vous dépanner (priorité disponibilité), quitte à régulariser plus tard.\n\nQuel compromis utiliseriez-vous pour une application de réservation de billets ?`;
  }

  if (q.includes('stratégie') || q.includes('révision') || q.includes('conseil')) {
    return `« Xam-xam mooy ndoxum xol » (Le savoir vivifie l'esprit).\n\nPour réviser avec méthode et tempérance, appliquez ces trois préceptes :\n\n1. **La régularité plutôt que l'effort dispersé** : Consacrez 2 à 3 sessions Pomodoro de 25 minutes concentrées chaque jour plutôt qu'une veille de nuit épuisante.\n2. **L'interrogation active** : Ne relisez pas passivement. Cachez vos notes et formulez à voix haute les principes clés et les définitions.\n3. **La persévérance (*Jom* & *Mun*)** : Face à une notion complexe, décomposez-la en sous-questions simples avant de la reconstituer.\n\nQuelle notion spécifique de votre cours souhaitez-vous éclaircir ?`;
  }

  if (q.includes('structur') || q.includes('travail') || q.includes('planning')) {
    return `La clarté de l'esprit commence par l'ordre de la journée.\n\nComme l'enseignait Kocc Barma, chaque tâche progresse par sa fondation :\n- **Hiérarchisez vos priorités** : Commencez par le cours le plus exigeant au moment où votre vigilance est optimale.\n- **Rythmez avec le Pomodoro** : 25 min d'immersion totale, suivies de 5 min de pause sans écran.\n- **Archivez vos cours** dans votre espace *Mes Cours* pour générer des quiz ciblés.\n\nVoulez-vous que nous planifiions un créneau d'étude dès maintenant ?`;
  }

  return `Bonjour ! C'est Kocc, votre tuteur EduFlow.\n\nJe suis à votre disposition pour vous accompagner dans la maîtrise de vos cours :\n- **Explication d'un concept** : Donnez-moi le nom du théorème, algorithme ou chapitre qui vous pose problème.\n- **Remédiation après un quiz** : Partagez vos erreurs pour que nous analysions les pièges et la bonne démarche.\n- **Méthode d'étude** : Conseils de révision active et structuration de planning.\n\nQuelle notion souhaitez-vous aborder maintenant ?`;
}

/**
 * Generates a standard conversational completion with full message history and multi-model failover
 */
export async function generateChatReply(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  systemInstruction?: string,
  modelName: GeminiModelName = DEFAULT_GEMINI_MODEL
): Promise<string> {
  const latestMessage = messages[messages.length - 1]?.content || '';

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
    return getKoccDevelopmentFallback(latestMessage);
  }

  const genAI = getGeminiClient();
  const modelsToTry = Array.from(new Set([modelName, ...CANDIDATE_GEMINI_MODELS]));
  let lastError: any = null;

  for (const m of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: 0.7,
        },
      });

      const history = buildGeminiHistory(messages.slice(0, -1));
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(latestMessage);
      return result.response.text();
    } catch (err: any) {
      console.warn(`[Gemini AI] Model ${m} chat attempt failed:`, err?.message || err);
      lastError = err;
    }
  }

  console.error('[Gemini AI] All models failed in generateChatReply:', lastError);
  return getKoccDevelopmentFallback(latestMessage);
}

/**
 * Streams chat responses chunk-by-chunk for real-time SSE streaming with multi-model failover
 */
export async function streamChatReply(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  systemInstruction?: string,
  modelName: GeminiModelName = DEFAULT_GEMINI_MODEL
) {
  const latestMessage = messages[messages.length - 1]?.content || '';

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
    throw new Error('NO_API_KEY_CONFIGURED');
  }

  const genAI = getGeminiClient();
  const modelsToTry = Array.from(new Set([modelName, ...CANDIDATE_GEMINI_MODELS]));
  let lastError: any = null;

  for (const m of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: 0.7,
        },
      });

      const history = buildGeminiHistory(messages.slice(0, -1));
      const chat = model.startChat({ history });
      return await chat.sendMessageStream(latestMessage);
    } catch (err: any) {
      console.warn(`[Gemini AI] Model ${m} stream attempt failed:`, err?.message || err);
      lastError = err;
    }
  }

  console.error('[Gemini AI] All models failed in streamChatReply:', lastError);
  throw lastError || new Error('All Gemini streaming models failed');
}
