import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { sendChatMessageSchema } from '@/lib/validations/chat';
import { generateChatReply, streamChatReply, DEFAULT_GEMINI_MODEL } from '@/lib/ai/gemini';
import { TUTOR_CHAT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { buildSpecialistTeachingPrompt } from '@/lib/ai/specialist-skills';
import { extractDocumentContent, findRelevantDocumentChunks } from '@/lib/courses/document-processor';
import { apiSuccess, apiError } from '@/lib/api/response';
import { SendChatMessageResponseData, ChatHistoryResponseData } from '@/types/api';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs';

/**
 * GET /api/ai/chat
 * Récupère les messages d'une discussion ou de la dernière discussion active depuis MySQL
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const { searchParams } = new URL(request.url);
    const sessionIdParam = searchParams.get('session_id') || searchParams.get('conversation');

    let resolvedSessionId = sessionIdParam;
    let sessionTitle = 'Discussion avec Kocc';

    const allSessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    });

    if (!resolvedSessionId && allSessions.length > 0) {
      resolvedSessionId = allSessions[0].id;
      sessionTitle = allSessions[0].title;
    }

    // Récupérer les matières associées à l'étudiant pour contextualiser Kocc
    const [scheduleSubjects, explicitSubjects] = await Promise.all([
      prisma.scheduleEntry.findMany({
        where: { userId: user.id },
        select: { subjectName: true },
        distinct: ['subjectName'],
      }),
      prisma.subject.findMany({
        where: { userId: user.id },
        select: { name: true },
        distinct: ['name'],
      }),
    ]);

    const uniqueSubjects = Array.from(
      new Set([
        ...scheduleSubjects.map((s) => s.subjectName.trim()),
        ...explicitSubjects.map((s) => s.name.trim()),
      ])
    ).filter(Boolean);

    if (!resolvedSessionId) {
      return apiSuccess({
        session_id: '',
        title: sessionTitle,
        sessions: [],
        messages: [],
        subjects: uniqueSubjects,
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        sessionId: resolvedSessionId,
        userId: user.id,
      },
      orderBy: { createdAt: 'asc' },
    });

    return apiSuccess({
      session_id: resolvedSessionId,
      title: sessionTitle,
      sessions: allSessions.map((s) => ({
        id: s.id,
        title: s.title,
        created_at: s.createdAt.toISOString(),
      })),
      subjects: uniqueSubjects,
      messages: messages.map((m) => ({
        id: m.id,
        session_id: m.sessionId,
        user_id: m.userId,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        metadata: m.metadata ? JSON.parse(m.metadata) : {},
        created_at: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Erreur GET /api/ai/chat :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * DELETE /api/ai/chat
 * Supprime une session de discussion spécifique ou tout l'historique de l'étudiant
 * Paramètres query :
 *   - ?session_id=<id> : supprime la session spécifique
 *   - ?all=true : supprime toutes les sessions de l'étudiant
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id') || searchParams.get('sessionId');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      const deletedCount = await prisma.chatSession.deleteMany({
        where: { userId: user.id },
      });
      return apiSuccess({
        message: 'Tout l\'historique des discussions a été supprimé',
        count: deletedCount.count,
      });
    }

    if (!sessionId) {
      return apiError('Identifiant de session manquant (?session_id=...)', 400);
    }

    // Vérifier l'appartenance de la session
    const existing = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });

    if (!existing) {
      return apiError('Session introuvable ou non autorisée', 404);
    }

    // Supprimer la session (les messages associés sont supprimés en cascade via onDelete: Cascade)
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return apiSuccess({
      message: 'Discussion supprimée avec succès',
      session_id: sessionId,
    });
  } catch (error) {
    console.error('Erreur DELETE /api/ai/chat :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne lors de la suppression',
      500
    );
  }
}

/**
 * POST /api/ai/chat
 * Envoie un message au Tuteur IA Gemini avec contexte RAG et persistance MySQL
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();
    const validationResult = sendChatMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Message invalide', 400, {
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { message, subject_name, document_id, context } = validationResult.data;
    let { session_id } = validationResult.data;

    // 1. Résolution ou création de la session de chat dans MySQL
    if (!session_id) {
      const newSession = await prisma.chatSession.create({
        data: {
          userId: user.id,
          title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
        },
      });
      session_id = newSession.id;
    } else {
      await prisma.chatSession.update({
        where: { id: session_id },
        data: { updatedAt: new Date() },
      }).catch(() => {});
    }

    const currentSessionId: string = session_id!;

    // 2. Récupération du profil académique de l'étudiant
    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        academicLevel: true,
        fieldOfStudy: true,
        fullName: true,
        academicGoals: true,
      },
    });

    // 3. Contexte RAG enrichi depuis les documents de cours (RAG sémantique ciblé)
    let documentContext = '';
    let docTitle: string | null = null;
    let docSubjectName: string | null = null;

    let targetDoc = null;
    if (document_id) {
      targetDoc = await prisma.document.findFirst({
        where: { id: document_id, userId: user.id },
        select: {
          id: true,
          title: true,
          summary: true,
          extractedText: true,
          filePath: true,
          fileType: true,
          subject: { select: { name: true } },
        },
      });
    } else {
      // Recherche contextuelle automatique si l'étudiant pose une question sur un cours
      const candidateDocs = await prisma.document.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          title: true,
          summary: true,
          extractedText: true,
          filePath: true,
          fileType: true,
          subject: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });

      const lowerMsg = message.toLowerCase();
      targetDoc =
        candidateDocs.find((d) => {
          const matchesTitle = lowerMsg.includes(d.title.toLowerCase());
          const matchesSubj =
            d.subject?.name &&
            (lowerMsg.includes(d.subject.name.toLowerCase()) ||
              (subject_name && d.subject.name.toLowerCase() === subject_name.toLowerCase()));
          return matchesTitle || matchesSubj;
        }) ||
        (subject_name
          ? candidateDocs.find(
              (d) => d.subject?.name?.toLowerCase() === subject_name.toLowerCase()
            )
          : null);
    }

    if (targetDoc) {
      docTitle = targetDoc.title;
      docSubjectName = targetDoc.subject?.name || null;
      let textContent = targetDoc.extractedText || '';

      // Si le texte est manquant en base mais que le fichier existe sur disque
      if ((!textContent || textContent.trim().length < 30) && targetDoc.filePath) {
        try {
          if (fs.existsSync(targetDoc.filePath)) {
            const buf = fs.readFileSync(targetDoc.filePath);
            const extracted = await extractDocumentContent(
              buf,
              targetDoc.title,
              targetDoc.fileType || 'application/pdf'
            );
            if (extracted && extracted.trim().length > 30) {
              textContent = extracted;
              await prisma.document.update({
                where: { id: targetDoc.id },
                data: { extractedText: extracted },
              });
            }
          }
        } catch (readErr) {
          console.warn('[chat] Erreur lecture fichier document :', readErr);
        }
      }

      if (textContent && textContent.trim().length > 0) {
        const relevantExcerpts = findRelevantDocumentChunks(textContent, message, 6, 5000);
        documentContext = `\n[DOCUMENT DE COURS ASSOCIÉ : "${targetDoc.title}"]\nRésumé : ${targetDoc.summary || 'Non disponible'}\nExtraits pertinents du support (RAG sémantique ciblé) :\n${relevantExcerpts || textContent.substring(0, 4000)}\n`;
      } else if (targetDoc.summary) {
        documentContext = `\n[DOCUMENT DE COURS ASSOCIÉ : "${targetDoc.title}"]\nRésumé : ${targetDoc.summary}\n`;
      }
    }

    // 3.bis Détection proactive des points de vigilance récents aux quiz (< 75%)
    let quizWeaknessesContext = '';
    try {
      const recentWeakQuizzes = await prisma.quiz.findMany({
        where: {
          userId: user.id,
          bestScore: { not: null, lt: 75 },
          ...(docSubjectName || subject_name
            ? {
                document: {
                  subject: {
                    name: subject_name || docSubjectName || undefined,
                  },
                },
              }
            : {}),
        },
        include: {
          questions: { take: 3 },
          document: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      if (recentWeakQuizzes.length > 0) {
        const issues = recentWeakQuizzes
          .map((q) => {
            const title = q.document?.title || q.title;
            const score = q.bestScore ?? 0;
            const questionsSummary = q.questions
              .map((qn) => `« ${qn.question.substring(0, 90)} »`)
              .join(' ; ');
            return `- Support "${title}" (score récent : ${score}%). Notions questionnées : ${questionsSummary}`;
          })
          .join('\n');

        quizWeaknessesContext = `\n[POINTS DE VIGILANCE RÉCENTS DE L'ÉTUDIANT AUX QUIZ (SCORE < 75%)]\nL'étudiant a récemment éprouvé des difficultés sur les notions suivantes :\n${issues}\nConsigne pédagogique : Si la discussion aborde ces notions, veille à expliciter les pièges fréquents, décomposer la méthode étape par étape et lui poser une question de vérification rapide.\n`;
      }
    } catch (qErr) {
      console.warn('[chat] Erreur récupération points de vigilance quiz :', qErr);
    }

    // 4. Récupération de l'historique conversationnel récent
    const pastMessages = await prisma.chatMessage.findMany({
      where: {
        sessionId: currentSessionId,
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const formattedHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = pastMessages
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

    formattedHistory.push({
      role: 'user',
      content: message,
    });

    // 5. Résolution des compétences didactiques spécialisées (matière & niveau)
    const effectiveSubject = subject_name || docSubjectName || null;
    const specialistPrompt = buildSpecialistTeachingPrompt({
      subjectName: effectiveSubject,
      academicLevel: userProfile?.academicLevel,
      fieldOfStudy: userProfile?.fieldOfStudy,
      userMessage: message,
      documentTitle: docTitle,
    });

    // 6. Instructions système pédagogiques enrichies
    let systemPromptWithContext = `
${TUTOR_CHAT_SYSTEM_PROMPT}

${specialistPrompt}

[INFORMATIONS CONTEXTUELLES DE L'ÉTUDIANT]
${userProfile?.fullName ? `- Étudiant : ${userProfile.fullName}` : ''}
${userProfile?.academicLevel ? `- Niveau académique : ${userProfile.academicLevel}` : ''}
${userProfile?.fieldOfStudy ? `- Filière d'études : ${userProfile.fieldOfStudy}` : ''}
${effectiveSubject ? `- Matière active : ${effectiveSubject}` : ''}
${context ? `- Contexte additionnel : ${context}` : ''}
${documentContext}
${quizWeaknessesContext}
`;

    // Détection d'une demande de remédiation post-quiz / session
    const isRemediationRequest =
      message.toLowerCase().includes('quiz') &&
      (message.toLowerCase().includes('erreur') ||
        message.toLowerCase().includes('point 1') ||
        message.toLowerCase().includes('rectifier'));

    if (isRemediationRequest) {
      systemPromptWithContext += `\n[DIRECTIVE PRIORITAIRE : REMÉDIATION POST-QUIZ / POST-SESSION]
L'étudiant te soumet ses erreurs suite à son évaluation.
Ne lui récite pas tout son cours et ne fais pas de longs discours généraux !
Directives :
1. Encourage l'étudiant avec bienveillance en une phrase.
2. Analyse chaque erreur listée : explique en 2-3 phrases simples quel était le piège, quelle est la règle exacte et comment ne plus se tromper.
3. Donne un exemple concret et court pour ancrer la notion.
4. Conclus en lui demandant s'il souhaite un mini-exercice d'application ou passer au chapitre suivant.
`;
    }

    const acceptHeader = request.headers.get('accept') || '';
    const wantsJsonExplicitly =
      acceptHeader.includes('application/json') &&
      !acceptHeader.includes('text/event-stream') &&
      body.stream === false;

    // Construction d'une réponse pédagogique contextuelle locale si Gemini n'est pas disponible
    const buildContextualFallbackReply = async (userPrompt: string): Promise<string> => {
      const lower = userPrompt.toLowerCase();

      // Cas 1 : Question de suivi ou clarification sur la notion discutée
      const isAskingWhichNotion =
        lower.includes('quel notion') ||
        lower.includes('quelle notion') ||
        lower.includes('de quoi tu parles') ||
        lower.includes('de quoi vous parlez') ||
        lower.includes('tu parles de quoi') ||
        lower.includes('je ne comprends pas') ||
        lower.includes('peux-tu preciser') ||
        lower.includes('peux-tu préciser');

      if (isAskingWhichNotion) {
        // Inspecter l'historique conversationnel récent
        const prevContent = formattedHistory
          .slice(0, -1)
          .map((m) => m.content)
          .join('\n')
          .toLowerCase();

        const discussedTopics: string[] = [];
        if (prevContent.includes('ricart') || prevContent.includes('agrawala')) {
          discussedTopics.push('- **L’Algorithme de Ricart-Agrawala** : L’exclusion mutuelle distribuée et le départage de priorité par le couple $(estampille, identifiant)$.');
        }
        if (prevContent.includes('cap') || prevContent.includes('partition')) {
          discussedTopics.push('- **Le Théorème CAP de Brewer** : Le choix obligé entre Cohérence (CP) et Disponibilité (AP) en cas de coupure réseau.');
        }
        if (prevContent.includes('lamport') || prevContent.includes('happened-before')) {
          discussedTopics.push('- **Les Horloges logiques de Lamport** : L’ordonnancement causal des événements dans un système distribué.');
        }

        if (discussedTopics.length > 0) {
          return `### Précision sur les notions abordées\n\nNous parlons précisément des notions de votre cours et de votre quiz récent :\n\n${discussedTopics.join('\n')}\n\n---\nQuel aspect spécifique vous semble encore obscur ? Je peux vous donner un nouvel exemple très simple pour vous aider à le visualiser !`;
        }

        if (targetDoc?.title) {
          return `### Contexte de votre étude\n\nNous échangeons autour de votre cours **« ${targetDoc.title} »** (${docSubjectName || 'Matière active'}).\n\nSouhaitez-vous que nous reprenions un point précis du cours, les questions du quiz, ou que nous fassions un exercice pratique ?`;
        }
      }

      // Cas 2 : Remédiation ciblée après quiz ou session
      if (
        lower.includes('terminer le quiz') ||
        lower.includes('commis des erreurs') ||
        lower.includes('rectifier') ||
        lower.includes('point 1') ||
        lower.includes('ricart') ||
        lower.includes('agrawala') ||
        lower.includes('théorème cap') ||
        lower.includes('theoreme cap')
      ) {
        const explanations: string[] = [];

        // Point Ricart-Agrawala
        if (lower.includes('ricart') || lower.includes('agrawala') || lower.includes('section critique')) {
          explanations.push(`#### 1. Algorithme de Ricart-Agrawala (Exclusion mutuelle distribuée)
- **Pourquoi la correction est exacte** :
  Dans un système distribué sans mémoire partagée, chaque processus voulant entrer en section critique diffuse une requête horodatée. Si deux processus émettent leur requête au même instant logique (même estampille de Lamport), il faut un mécanisme strict et déterministe pour départager les priorités sans recourir à un coordinateur central. L'ordre total est établi par le couple $(estampille, ID\\_site)$. Les identifiants des sites étant uniques, le processus ayant le plus petit identifiant obtient la priorité sans aucune ambiguïté.
- **Le piège fréquent** :
  Penser que l'estampille de Lamport suffit à elle seule, alors qu'elle ne définit qu'un ordre partiel (égalité possible entre deux sites).
- **Exemple simple** :
  Deux personnes tirent le ticket numéro $10$ au guichet. Pour savoir qui passe en premier, le guichetier regarde leur numéro d'adhérent : l'adhérent $1$ passe avant l'adhérent $2$ car $(10, 1) < (10, 2)$.`);
        }

        // Point Théorème CAP
        if (lower.includes('cap') || lower.includes('partition') || lower.includes('disponibilité') || lower.includes('cohérence')) {
          explanations.push(`#### 2. Théorème CAP de Brewer (Systèmes distribués)
- **Pourquoi la correction est exacte** :
  Lorsqu'une partition réseau ($P$) survient — c'est-à-dire une coupure physique de communication entre des nœuds —, le système ne peut pas synchroniser ses copies en temps réel. Il est donc contraint de choisir :
  - **Option AP (Disponibilité)** : Continuer de répondre aux clients des deux côtés, au prix d'accepter des données temporairement désynchronisées (divergence temporaire).
  - **Option CP (Cohérence)** : Refuser les écritures ou bloquer les requêtes d'un côté pour garantir qu'aucune donnée divergente ne soit enregistrée, au prix de rendre le service indisponible pour ces utilisateurs.
- **Le piège fréquent** :
  Croire qu'un système distribué peut être à la fois $C$, $A$ et $P$. Dans un réseau réel, les pannes ($P$) sont inévitables ; on ne choisit donc pas entre $C$ et $A$ dans l'absolu, mais entre $CP$ et $AP$ *quand* une coupure $P$ se produit.
- **Exemple simple** :
  La liaison internet entre un distributeur de billets (DAB) et la banque est coupée :
  - En mode **CP** : Le distributeur refuse tout retrait et affiche « En panne » (maintien de la cohérence du compte).
  - En mode **AP** : Le distributeur vous délivre les billets demandés sans vérifier le solde (maintien de la disponibilité), avec risque de découvert à régulariser ultérieurement.`);
        }

        // Si d'autres points d'erreur sont présents
        const errorLines = userPrompt
          .split('\n')
          .filter((l) => l.trim().startsWith('Point ') && !l.includes('Ricart') && !l.includes('CAP'));

        for (const line of errorLines) {
          const clean = line.replace(/Point \d+\s*:\s*/i, '').trim();
          explanations.push(`#### Analyse complémentaire\n- **Notion** : ${clean}\n- **Méthode** : Identifiez les conditions d'exclusion dans l'énoncé et reliez la propriété théorique à son application pratique.`);
        }

        const bodyExplanations =
          explanations.length > 0
            ? explanations.join('\n\n---\n\n')
            : `1. **Bien décomposer l'énoncé** : Repérez les conditions d'exclusion et les mots-clés.\n2. **Règle clé** : Vérifiez la définition stricte du concept avant de comparer les options.\n3. **Validation** : Éliminez d'abord les deux options manifestement incorrectes.`;

        return `### Remédiation ciblée avec Kocc\n\nBravo pour votre persévérance ! Analyser avec rigueur ses erreurs est le fondement même de la réussite (*« Xam-xam mooy ndoxum xol »*).\n\nVoici le décryptage pédagogique complet de vos questions :\n\n${bodyExplanations}\n\n---\n**Conseil pour progresser** :\nVous pouvez maintenant consolider cette matière en posant une question complémentaire ou en **important le chapitre suivant** pour continuer à avancer dans votre programme !`;
      }

      const docs = await prisma.document.findMany({
        where: { userId: user.id },
        include: { subject: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const matchedDoc =
        docs.find(
          (d) =>
            lower.includes(d.title.toLowerCase()) ||
            (d.subject?.name && lower.includes(d.subject.name.toLowerCase()))
        ) || docs[0];

      if (lower.includes('planning') || lower.includes('emploi') || lower.includes('programme')) {
        const entries = await prisma.scheduleEntry.findMany({
          where: { userId: user.id },
          take: 5,
        });
        const subjectsList = Array.from(new Set(entries.map((e) => e.subjectName))).join(', ');
        return `### Organisation de vos révisions\n\nVotre planning est synchronisé avec vos cours (${subjectsList || 'Emploi du temps actif'}).\n- **Méthode recommandée** : Alternez un bloc de révision active de $90$ minutes sur vos créneaux libres avec une session **Focus Pomodoro** de $25$ minutes.\n- **Priorité du jour** : Commencez par valider les flashcards et le quiz du support **${matchedDoc?.title || 'prioritaire'}** avant de passer aux exercices d'application.`;
      }

      if (matchedDoc && matchedDoc.summary) {
        return `### Synthèse pédagogique — ${matchedDoc.title}\n\nVoici les points fondamentaux à retenir :\n\n${matchedDoc.summary}\n\n- **Conseil de Kocc** : Testez directement votre assimilation en lançant la session de révision ou en posant une question ciblée.`;
      }

      return `### Accompagnement pédagogique — Kocc\n\nPour aborder efficacement cette notion :\n1. **Définition précise** : Identifiez le rôle du concept et le problème qu'il résout.\n2. **Application concrète** : Reliez la règle à un cas pratique ou un schéma.\n3. **Validation** : N'hésitez pas à me demander un exemple ou un mini-quiz pour vérifier votre compréhension.`;
    };

    // 5. Mode Streaming SSE
    if (!wantsJsonExplicitly) {
      // Enregistrer le message de l'utilisateur
      await prisma.chatMessage.create({
        data: {
          sessionId: currentSessionId,
          userId: user.id,
          role: 'user',
          content: message,
          metadata: JSON.stringify({ subject_name, document_id }),
        },
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullText = '';
          try {
            const streamResult = await streamChatReply(
              formattedHistory,
              systemPromptWithContext,
              DEFAULT_GEMINI_MODEL
            );

            for await (const chunk of streamResult.stream) {
              const text = chunk.text();
              fullText += text;
              const eventPayload = JSON.stringify({ type: 'content', content: text });
              controller.enqueue(encoder.encode(`data: ${eventPayload}\n\n`));
            }
          } catch (streamErr) {
            console.error('[Chat API] Erreur streaming LLM :', streamErr);
            if (!fullText) {
              fullText = await buildContextualFallbackReply(message);
              const words = fullText.split(' ');
              for (let i = 0; i < words.length; i += 4) {
                const slice = words.slice(i, i + 4).join(' ') + (i + 4 < words.length ? ' ' : '');
                const eventPayload = JSON.stringify({ type: 'content', content: slice });
                controller.enqueue(encoder.encode(`data: ${eventPayload}\n\n`));
              }
            }
          }

          try {
            // Enregistrer la réponse de l'assistant dans MySQL
            const assistantMsg = await prisma.chatMessage.create({
              data: {
                sessionId: currentSessionId,
                userId: user.id,
                role: 'assistant',
                content: fullText,
                metadata: JSON.stringify({ model: DEFAULT_GEMINI_MODEL }),
              },
            });

            const donePayload = JSON.stringify({
              type: 'done',
              message_id: assistantMsg.id,
              session_id: currentSessionId,
            });
            controller.enqueue(encoder.encode(`data: ${donePayload}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    // 6. Mode standard JSON synchrone
    let assistantReply: string;
    try {
      assistantReply = await generateChatReply(
        formattedHistory,
        systemPromptWithContext,
        DEFAULT_GEMINI_MODEL
      );
    } catch (syncErr) {
      console.error('[Chat API] Erreur synchrone LLM :', syncErr);
      assistantReply = await buildContextualFallbackReply(message);
    }

    const userMsgRecord = await prisma.chatMessage.create({
      data: {
        sessionId: currentSessionId,
        userId: user.id,
        role: 'user',
        content: message,
        metadata: JSON.stringify({ subject_name, document_id }),
      },
    });

    const assistantMsgRecord = await prisma.chatMessage.create({
      data: {
        sessionId: currentSessionId,
        userId: user.id,
        role: 'assistant',
        content: assistantReply,
        metadata: JSON.stringify({ model: DEFAULT_GEMINI_MODEL }),
      },
    });

    const responsePayload: SendChatMessageResponseData = {
      session_id: currentSessionId,
      user_message: {
        id: userMsgRecord.id,
        session_id: userMsgRecord.sessionId,
        user_id: userMsgRecord.userId,
        role: userMsgRecord.role as 'user',
        content: userMsgRecord.content,
        metadata: userMsgRecord.metadata ? JSON.parse(userMsgRecord.metadata) : {},
        created_at: userMsgRecord.createdAt.toISOString(),
      },
      assistant_message: {
        id: assistantMsgRecord.id,
        session_id: assistantMsgRecord.sessionId,
        user_id: assistantMsgRecord.userId,
        role: assistantMsgRecord.role as 'assistant',
        content: assistantMsgRecord.content,
        metadata: assistantMsgRecord.metadata ? JSON.parse(assistantMsgRecord.metadata) : {},
        created_at: assistantMsgRecord.createdAt.toISOString(),
      },
    };

    return apiSuccess<SendChatMessageResponseData>(responsePayload);
  } catch (error) {
    console.error('Erreur POST /api/ai/chat :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne lors de la réponse du tuteur IA',
      500
    );
  }
}
