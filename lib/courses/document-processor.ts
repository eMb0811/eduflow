/**
 * document-processor.ts
 * Moteur d'extraction et d'analyse pédagogique des documents de cours pour EduFlow.
 * Lit les fichiers réels (PDF numériques, PDF scannés via OCR Gemini, Markdown, texte, code)
 * et génère la synthèse, les flashcards et le quiz d'évaluation avec Gemini 3.8 Flash.
 */

import pdf from 'pdf-parse';
import { getGeminiClient, DEFAULT_GEMINI_MODEL, CANDIDATE_GEMINI_MODELS, generateStructuredJson, cleanAndParseJson } from '@/lib/ai/gemini';
import { COURSE_PACK_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { AutoCourseAnalysis, analyzeCourseAutomatically, formatAcademicTitle } from '@/lib/courses/kocc-packs';

export interface DocumentProcessingParams {
  rawTitle: string;
  extractedText?: string | null;
  fileBuffer?: Buffer | null;
  fileType?: string | null;
  scheduleSubjects: Array<{ name: string; color: string }>;
  explicitSubjectName?: string;
  academicLevel?: string | null;
}

interface CoursePackAiResponse {
  clean_title?: string;
  subject_name?: string;
  summary?: string;
  key_concepts?: string[];
  flashcards?: Array<{
    question: string;
    answer: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  quiz_questions?: Array<{
    question: string;
    options: string[];
    correct_answer_index: number;
    explanation: string;
  }>;
}

/**
 * Extrait le texte réel depuis un document téléversé (PDF numérique, PDF scanné, TXT, MD, etc.)
 */
export async function extractDocumentContent(
  buffer: Buffer,
  filename: string,
  fileType = 'application/pdf'
): Promise<string> {
  const lowerName = filename.toLowerCase();

  // 1. Fichiers texte brut / Markdown / Code
  if (
    fileType.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.json') ||
    lowerName.endsWith('.csv')
  ) {
    return buffer.toString('utf-8');
  }

  // 2. Fichiers PDF
  if (fileType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    try {
      const pdfData = await pdf(buffer);
      const text = (pdfData.text || '').trim();

      // Si le PDF contenait du texte numérique suffisant (> 80 caractères)
      if (text.length > 80) {
        return text;
      }
    } catch (pdfErr) {
      console.warn('[DocumentProcessor] Échec extraction locale pdf-parse, tentative OCR Gemini :', pdfErr);
    }

    // 3. Fallback OCR intelligent via Gemini (si PDF scanné ou diapos en images)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      const genAI = getGeminiClient();
      for (const m of CANDIDATE_GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const result = await model.generateContent([
            {
              inlineData: {
                data: buffer.toString('base64'),
                mimeType: 'application/pdf',
              },
            },
            'Extrais et retranscris intégralement tout le texte, les définitions, théorèmes, calculs, formules et structures de ce cours en français avec rigueur pédagogique.',
          ]);
          const ocrText = result.response.text();
          if (ocrText && ocrText.trim().length > 50) {
            return ocrText.trim();
          }
        } catch (geminiErr) {
          console.warn(`[DocumentProcessor] OCR Gemini sur PDF avec modèle ${m} a échoué:`, geminiErr);
        }
      }
    }
  }

  // 4. Fichiers Images (PNG, JPEG, WebP)
  if (fileType.startsWith('image/')) {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      const genAI = getGeminiClient();
      for (const m of CANDIDATE_GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const result = await model.generateContent([
            {
              inlineData: {
                data: buffer.toString('base64'),
                mimeType: fileType,
              },
            },
            'Extrais et transcris fidèlement toutes les notes de cours, formules et notions visibles sur cette image de document académique.',
          ]);
          return result.response.text().trim();
        } catch (imgErr) {
          console.warn(`[DocumentProcessor] OCR Gemini sur image avec modèle ${m} a échoué:`, imgErr);
        }
      }
    }
  }

  return '';
}

/**
 * Découpe un document en sections/chunks sémantiques et recherche les passages
 * les plus pertinents par rapport à la question de l'étudiant (RAG sémantique ciblé).
 * Permet à Kocc de répondre précisément depuis n'importe quel chapitre d'un gros PDF.
 */
export function findRelevantDocumentChunks(
  fullText: string,
  userQuery: string,
  maxChunks = 4,
  maxTotalChars = 5000
): string {
  if (!fullText) return '';
  const trimmed = fullText.trim();
  if (trimmed.length <= maxTotalChars) {
    return trimmed;
  }

  // 1. Découpage par sections (titres Markdown # ou sauts de paragraphe)
  const rawSections = trimmed.split(/(?=\n#{1,4}\s+)|\n\s*\n/g);
  const chunks: string[] = [];

  let currentChunk = '';
  for (const sec of rawSections) {
    const s = sec.trim();
    if (!s) continue;
    if (currentChunk.length + s.length < 1500) {
      currentChunk += (currentChunk ? '\n\n' : '') + s;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = s;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  if (chunks.length <= maxChunks) {
    return chunks.join('\n\n---\n\n').substring(0, maxTotalChars);
  }

  // 2. Mots-clés de la requête (exclusion des stop-words français)
  const stopWords = new Set([
    'alors', 'au', 'aucuns', 'aussi', 'autre', 'avant', 'avec', 'avoir', 'bon', 'car', 'ce', 'cela', 'ces',
    'ceux', 'chaque', 'ci', 'comme', 'comment', 'dans', 'des', 'du', 'elle', 'en', 'encore', 'essai', 'est',
    'et', 'eu', 'fait', 'faites', 'fois', 'font', 'hors', 'ici', 'il', 'ils', 'je', 'juste', 'la', 'le',
    'les', 'leur', 'là', 'ma', 'maintenant', 'mais', 'mes', 'mien', 'moins', 'mon', 'mot', 'même', 'ni',
    'nommés', 'notre', 'nous', 'ou', 'où', 'par', 'parce', 'pas', 'peut', 'peu', 'plupart', 'pour', 'pourquoi',
    'quand', 'que', 'quel', 'quelle', 'quelles', 'quels', 'qui', 'sa', 'sans', 'ses', 'seulement', 'si',
    'sien', 'son', 'sont', 'sous', 'soyez', 'sur', 'ta', 'tandis', 'tellement', 'tels', 'tes', 'ton', 'tous',
    'tout', 'trop', 'très', 'tu', 'voient', 'vont', 'votre', 'vous', 'vu', 'ça', 'étaient', 'état', 'étions', 'été', 'être'
  ]);

  const queryTerms = (userQuery || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_-]+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  // 3. Calcul de score pour chaque chunk
  const scoredChunks = chunks.map((chunk, idx) => {
    const normChunk = chunk
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    let score = 0;
    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${term}`, 'g');
      const matches = normChunk.match(regex);
      if (matches) {
        score += matches.length * 3;
      }
    }

    // Léger bonus d'introduction (chunk 0)
    if (idx === 0) score += 1;

    return { chunk, score, idx };
  });

  // 4. Sélection des meilleurs chunks
  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks
    .slice(0, maxChunks)
    .sort((a, b) => a.idx - b.idx) // Réordonner chronologiquement
    .map((c) => c.chunk);

  const merged = topChunks.join('\n\n---\n\n');
  return merged.length > maxTotalChars ? merged.substring(0, maxTotalChars) : merged;
}

/**
 * Traite un document de cours avec Gemini 3.8 Flash pour générer son Pack Complet
 * (Synthèse structurée, Concepts clés, Flashcards actives, Quiz d'évaluation)
 * à partir de son CONTENU RÉEL.
 */
export async function processCourseDocumentWithAi(
  params: DocumentProcessingParams
): Promise<AutoCourseAnalysis> {
  const {
    rawTitle,
    extractedText,
    fileBuffer,
    fileType,
    scheduleSubjects,
    explicitSubjectName,
    academicLevel,
  } = params;

  const cleanFallbackTitle = formatAcademicTitle(rawTitle);

  // Si une clé Gemini est configurée et qu'on a du texte extrait ou un buffer PDF
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    const genAI = getGeminiClient();
    const subjectsContext = scheduleSubjects.map((s) => s.name).join(', ');
    const promptInstruction = `
DOCUMENT À ANALYSER : "${rawTitle}"
${explicitSubjectName ? `MATIÈRE EXPLICITE SOUHAITÉE : "${explicitSubjectName}"` : ''}
${subjectsContext ? `MATIÈRES DE L'EMPLOI DU TEMPS DE L'ÉTUDIANT : ${subjectsContext}` : ''}
${academicLevel ? `NIVEAU ACADÉMIQUE DE L'ÉTUDIANT : "${academicLevel}"` : ''}

Consigne : Analyse le contenu du cours ci-joint et produis le Pack Complet d'Étude au format JSON demandé.
`;

    for (const m of CANDIDATE_GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: m,
          systemInstruction: COURSE_PACK_SYSTEM_PROMPT,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        let aiResponseText = '';

        if (extractedText && extractedText.trim().length > 60) {
          // Envoi du texte extrait (tronqué à 60 000 caractères si très volumineux pour rapidité)
          const contentSlice = extractedText.substring(0, 60000);
          const result = await model.generateContent([
            promptInstruction,
            `\nCONTENU DU DOCUMENT :\n${contentSlice}`,
          ]);
          aiResponseText = result.response.text();
        } else if (fileBuffer && (fileType === 'application/pdf' || rawTitle.toLowerCase().endsWith('.pdf'))) {
          // Envoi direct du document PDF via vision multimodale
          const result = await model.generateContent([
            {
              inlineData: {
                data: fileBuffer.toString('base64'),
                mimeType: 'application/pdf',
              },
            },
            promptInstruction,
          ]);
          aiResponseText = result.response.text();
        }

        if (aiResponseText) {
          const parsed = cleanAndParseJson<CoursePackAiResponse>(aiResponseText);

        if (parsed.summary && Array.isArray(parsed.flashcards) && Array.isArray(parsed.quiz_questions)) {
          // Résolution de la couleur de la matière
          const detectedSubjectName =
            explicitSubjectName || parsed.subject_name || 'Cours Universitaire';
          const matchedSubject = scheduleSubjects.find(
            (s) => s.name.toLowerCase() === detectedSubjectName.toLowerCase()
          );
          const subjectColor = matchedSubject?.color || '#4F46E5';

          return {
            cleanTitle: parsed.clean_title || cleanFallbackTitle,
            subjectName: detectedSubjectName,
            subjectColor,
            summary: parsed.summary,
            keyConcepts:
              parsed.key_concepts && parsed.key_concepts.length > 0
                ? parsed.key_concepts
                : [`Notions clés de ${cleanFallbackTitle}`],
            flashcards: parsed.flashcards.map((f) => ({
              question: f.question,
              answer: f.answer,
              difficulty: f.difficulty || 'medium',
            })),
            quizQuestions: parsed.quiz_questions.map((q) => ({
              question: q.question,
              options:
                Array.isArray(q.options) && q.options.length === 4
                  ? q.options
                  : ['Option A', 'Option B', 'Option C', 'Option D'],
              correctAnswerIndex:
                typeof q.correct_answer_index === 'number' &&
                q.correct_answer_index >= 0 &&
                q.correct_answer_index < 4
                  ? q.correct_answer_index
                  : 0,
              explanation: q.explanation || 'Explication de la réponse correcte.',
            })),
          };
        }
      }
    } catch (aiError) {
      console.warn(`[DocumentProcessor] Essai modèle ${m} a échoué:`, aiError instanceof Error ? aiError.message : aiError);
    }
  }
}

  // Si aucune clé Gemini n'est configurée mais qu'on a un intitulé ou sujet
  return analyzeCourseAutomatically(
    rawTitle,
    extractedText || null,
    scheduleSubjects,
    explicitSubjectName
  );
}
