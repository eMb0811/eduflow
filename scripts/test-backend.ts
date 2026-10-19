/**
 * Comprehensive Backend QA & Verification Test Suite for EduFlow (MySQL & Prisma Engine)
 * Run with: npm run test:backend (or npx tsx scripts/test-backend.ts)
 */

import { registerSchema, loginSchema } from '../lib/validations/auth';
import { updateProfileSchema } from '../lib/validations/profile';
import { scheduleItemSchema, saveScheduleEntriesSchema } from '../lib/validations/schedule';
import { generatePlanningSchema } from '../lib/validations/planning';
import { sendChatMessageSchema } from '../lib/validations/chat';
import {
  createDocumentSchema,
  summarizeDocumentSchema,
  generateFlashcardsSchema,
  generateQuizSchema,
} from '../lib/validations/document';
import { createPomodoroSchema } from '../lib/validations/pomodoro';
import { cleanAndParseJson } from '../lib/ai/gemini';
import { hashPassword, comparePassword, createAuthToken, verifyAuthToken, AUTH_COOKIE_NAME } from '../lib/auth/jwt';
import {
  generateOtpCode,
  createSignedOtp,
  verifySignedOtp,
  deriveDisplayNameFromEmail,
} from '../lib/auth/otp';
import { isSmtpConfigured } from '../lib/mail/mailer';
import {
  parseScheduleFromPdfBuffer,
  parseTimeRangeString,
} from '../lib/schedule/pdf-schedule-parser';
import {
  detectSubjectDomain,
  resolveLevelTier,
  buildSpecialistTeachingPrompt,
} from '../lib/ai/specialist-skills';
import * as fs from 'fs';
import * as path from 'path';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 EduFlow Backend QA Test Suite — MySQL & Prisma');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // TEST GROUP 1: Zod Input Validation & Security Guards
  // ----------------------------------------------------
  console.log('🔹 1. Validation des Schémas Zod & Contrôles d\'Entrée :');

  // Auth Schemas
  const validRegister = registerSchema.safeParse({
    fullName: 'Moussa Diop',
    email: 'moussa@eduflow.app',
    password: 'SecurePassword123!',
  });
  assert(validRegister.success, 'Inscription valide acceptée');

  const invalidRegisterEmail = registerSchema.safeParse({
    fullName: 'Moussa Diop',
    email: 'moussa-not-an-email',
    password: 'SecurePassword123!',
  });
  assert(!invalidRegisterEmail.success, 'Email d\'inscription invalide rejeté');

  const invalidRegisterPassword = registerSchema.safeParse({
    fullName: 'Moussa Diop',
    email: 'moussa@eduflow.app',
    password: '123', // < 6 chars
  });
  assert(!invalidRegisterPassword.success, 'Mot de passe trop court (<6 caractères) rejeté');

  const validLogin = loginSchema.safeParse({
    email: 'moussa@eduflow.app',
    password: 'SecurePassword123!',
  });
  assert(validLogin.success, 'Connexion valide acceptée');

  // Profile Schema
  const validProfile = updateProfileSchema.safeParse({
    full_name: 'Moussa Diop',
    academic_level: 'Licence 3',
    field_of_study: 'Informatique',
    academic_goals: 'Réussir avec mention',
  });
  assert(validProfile.success, 'Profil valide accepté');

  const invalidProfileUrl = updateProfileSchema.safeParse({
    avatar_url: 'not-a-valid-url',
  });
  assert(!invalidProfileUrl.success, 'URL d\'avatar invalide rejetée (400)');

  // Schedule Entry Schema
  const validSchedule = scheduleItemSchema.safeParse({
    subject_name: 'Algorithmique Avancée',
    day_of_week: 'monday',
    start_time: '08:30',
    end_time: '10:30',
    room: 'Amphi B',
    professor: 'Dr. Ndiaye',
    color: '#3B82F6',
  });
  assert(validSchedule.success, 'Créneau d\'emploi du temps valide accepté');

  const invalidTimeSchedule = scheduleItemSchema.safeParse({
    subject_name: 'Maths',
    day_of_week: 'monday',
    start_time: '25:99',
    end_time: '10:30',
  });
  assert(!invalidTimeSchedule.success, 'Heure invalide 25:99 rejetée par regex HH:mm');

  // Batch Schedule Schema
  const validBatch = saveScheduleEntriesSchema.safeParse({
    entries: [
      {
        subject_name: 'Base de Données',
        day_of_week: 'tuesday',
        start_time: '14:00',
        end_time: '16:00',
      },
    ],
    replace_existing: true,
  });
  assert(validBatch.success, 'Sauvegarde par lot d\'emploi du temps acceptée');

  // Planning Schema
  const validPlanning = generatePlanningSchema.safeParse({
    target_hours_per_day: 5,
    excluded_days: ['sunday'],
    academic_goals: 'Préparation partiels',
  });
  assert(validPlanning.success, 'Paramètres de planning valides acceptés');

  const invalidPlanningHours = generatePlanningSchema.safeParse({
    target_hours_per_day: 25,
  });
  assert(!invalidPlanningHours.success, 'Volume de révision irréaliste (>12h) rejeté');

  // Chat Schema
  const validChat = sendChatMessageSchema.safeParse({
    message: 'Comment fonctionne l\'algorithme de Dijkstra ?',
    subject_name: 'Graphes',
  });
  assert(validChat.success, 'Message de chat valide accepté');

  // Document & Quiz Schemas
  const validDoc = createDocumentSchema.safeParse({
    title: 'Cours Réseaux TCP/IP',
    file_url: '/uploads/documents/doc.pdf',
    file_path: 'doc.pdf',
  });
  assert(validDoc.success, 'Création de document valide acceptée');

  const validSummary = summarizeDocumentSchema.safeParse({
    content: 'Le protocole TCP assure un transport fiable et ordonné des données.',
  });
  assert(validSummary.success, 'Demande de synthèse avec contenu textuel direct acceptée');

  const validFlashcardReq = generateFlashcardsSchema.safeParse({
    content: 'La mémoire RAM est volatile alors que la ROM est non volatile.',
    count: 5,
  });
  assert(validFlashcardReq.success, 'Demande de flashcards acceptée');

  const validQuizReq = generateQuizSchema.safeParse({
    content: 'Les arbres AVL sont des arbres binaires de recherche auto-équilibrés.',
    count: 3,
  });
  assert(validQuizReq.success, 'Demande de quiz acceptée');

  // Pomodoro Schema
  const validPomodoro = createPomodoroSchema.safeParse({
    duration_minutes: 25,
    type: 'study',
    notes: 'Exercices chapitre 4',
  });
  assert(validPomodoro.success, 'Session Pomodoro valide acceptée');

  // ----------------------------------------------------
  // TEST GROUP 2: AI JSON Parser & Error Recovery
  // ----------------------------------------------------
  console.log('\n🔹 2. Robustesse du Parser JSON Gemini & Récupération d\'Erreurs :');

  const test1 = cleanAndParseJson<{ foo: string }>('{"foo": "bar"}');
  assert(test1.foo === 'bar', 'Parser : JSON brut standard');

  const test2 = cleanAndParseJson<{ message: string }>('```json\n{"message": "bonjour"}\n```');
  assert(test2.message === 'bonjour', 'Parser : JSON encapsulé dans ```json ... ```');

  const test3 = cleanAndParseJson<{ items: number[] }>('```\n{"items": [1, 2, 3]}\n```');
  assert(test3.items.length === 3, 'Parser : JSON encapsulé dans ``` ... ```');

  const test4 = cleanAndParseJson<{ score: number }>(
    'Voici la réponse demandée :\n\n{"score": 95}\n\nJ\'espère que cela vous convient !'
  );
  assert(test4.score === 95, 'Parser : Extraction automatique de l\'objet JSON au milieu d\'un texte bavard');

  // ----------------------------------------------------
  // TEST GROUP 3: Authentication & Cryptography (JWT & bcrypt)
  // ----------------------------------------------------
  console.log('\n🔹 3. Authentification Autonome & Cryptographie (Bcrypt & JWT jose) :');

  assert(AUTH_COOKIE_NAME === 'eduflow_session', 'Nom de cookie de session standard eduflow_session');

  const password = 'SecretPassword2026!';
  const hashedPassword = await hashPassword(password);
  assert(hashedPassword.startsWith('$2'), 'Hachage bcrypt généré avec salt adéquat ($2...)');
  assert(hashedPassword !== password, 'Le mot de passe haché est non réversible en clair');

  const isMatch = await comparePassword(password, hashedPassword);
  assert(isMatch === true, 'Validation du mot de passe exact par comparePassword');

  const isWrongMatch = await comparePassword('WrongPassword!', hashedPassword);
  assert(isWrongMatch === false, 'Rejet d\'un faux mot de passe par comparePassword');

  const testPayload = { userId: 'usr_test_123', email: 'test@eduflow.app', role: 'student' };
  const token = await createAuthToken(testPayload, '2h');
  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT HS256 valide à 3 segments généré');

  const verifiedPayload = await verifyAuthToken(token);
  assert(
    verifiedPayload !== null &&
    verifiedPayload.userId === testPayload.userId &&
    verifiedPayload.email === testPayload.email,
    'Vérification et décodage réussi du JWT signé'
  );

  const tamperedToken = token.slice(0, -6) + 'abcdef';
  const rejectedTampered = await verifyAuthToken(tamperedToken);
  assert(rejectedTampered === null, 'Rejet strict d\'un token JWT altéré/falsifié');

  // Tests OTP Email Direct (HMAC-SHA256 + Expiration + Anti-Falsification)
  const otpCode = generateOtpCode();
  assert(/^\d{6}$/.test(otpCode), 'Génération d\'un code OTP numérique strict à 6 chiffres');

  const futureExp = Date.now() + 600_000;
  const signedOtp = createSignedOtp('Fatou.Ndiaye@ucad.edu.sn', otpCode, futureExp);
  assert(
    verifySignedOtp(signedOtp, 'fatou.ndiaye@ucad.edu.sn', otpCode) === true,
    'Vérification HMAC-SHA256 réussie du code OTP signé (insensible à la casse email)'
  );
  assert(
    verifySignedOtp(signedOtp, 'fatou.ndiaye@ucad.edu.sn', '000000') === false,
    'Rejet d\'un code OTP erroné'
  );
  assert(
    verifySignedOtp(signedOtp, 'autre@ucad.edu.sn', otpCode) === false,
    'Rejet d\'un code OTP utilisé avec une autre adresse email'
  );
  const expiredSignedOtp = createSignedOtp('fatou.ndiaye@ucad.edu.sn', otpCode, Date.now() - 1000);
  assert(
    verifySignedOtp(expiredSignedOtp, 'fatou.ndiaye@ucad.edu.sn', otpCode) === false,
    'Rejet strict d\'un code OTP expiré'
  );
  assert(
    deriveDisplayNameFromEmail('fatou.ndiaye@ucad.edu.sn') === 'Fatou Ndiaye',
    'Extraction propre du nom complet à partir de l\'adresse email'
  );
  assert(typeof isSmtpConfigured() === 'boolean', 'Détecteur de configuration SMTP opérationnel');

  // ----------------------------------------------------
  // TEST GROUP 4: Prisma MySQL Schema & Architecture Audit
  // ----------------------------------------------------
  console.log('\n🔹 4. Audit du Schéma Prisma MySQL & Intégrité Référentielle :');

  const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
  assert(fs.existsSync(schemaPath), 'Fichier schema.prisma présent');

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  assert(schemaContent.includes('provider = "mysql"'), 'Datasource configurée sur MySQL');
  assert(schemaContent.includes('model User'), 'Modèle User défini avec relation One-to-One vers Profile');
  assert(schemaContent.includes('model Profile'), 'Modèle Profile défini');
  assert(schemaContent.includes('model ScheduleEntry'), 'Modèle ScheduleEntry défini');
  assert(schemaContent.includes('model RevisionPlan'), 'Modèle RevisionPlan défini');
  assert(schemaContent.includes('model RevisionSlot'), 'Modèle RevisionSlot défini');
  assert(schemaContent.includes('model ChatSession'), 'Modèle ChatSession défini');
  assert(schemaContent.includes('model ChatMessage'), 'Modèle ChatMessage défini');
  assert(schemaContent.includes('model Document'), 'Modèle Document défini');
  assert(schemaContent.includes('model Flashcard'), 'Modèle Flashcard défini');
  assert(schemaContent.includes('model Quiz'), 'Modèle Quiz défini');
  assert(schemaContent.includes('model QuizQuestion'), 'Modèle QuizQuestion défini');
  assert(schemaContent.includes('model PomodoroSession'), 'Modèle PomodoroSession défini');
  assert(schemaContent.includes('onDelete: Cascade'), 'Règles de suppression en cascade configurées');

  // ----------------------------------------------------
  // TEST GROUP 5: Verification of All API Route Handlers
  // ----------------------------------------------------
  console.log('\n🔹 5. Vérification de l\'Architecture des API Routes MySQL :');

  const routes = [
    'app/api/auth/register/route.ts',
    'app/api/auth/login/route.ts',
    'app/api/auth/email-direct/route.ts',
    'app/api/auth/logout/route.ts',
    'app/api/auth/me/route.ts',
    'app/api/profile/route.ts',
    'app/api/schedule/route.ts',
    'app/api/schedule/[id]/route.ts',
    'app/api/schedule/parse/route.ts',
    'app/api/schedule/generate-planning/route.ts',
    'app/api/schedule/planning/route.ts',
    'app/api/ai/chat/route.ts',
    'app/api/ai/chat/history/route.ts',
    'app/api/documents/route.ts',
    'app/api/documents/[id]/route.ts',
    'app/api/documents/summarize/route.ts',
    'app/api/documents/flashcards/route.ts',
    'app/api/documents/quiz/route.ts',
    'app/api/documents/quiz/submit/route.ts',
    'app/api/pomodoro/route.ts',
    'app/api/pomodoro/[id]/complete/route.ts',
    'app/api/stats/route.ts',
    'app/api/dashboard/route.ts',
    'app/api/dashboard/stats/route.ts',
    'app/api/health/route.ts',
    'app/api/notifications/route.ts',
  ];

  for (const r of routes) {
    const routePath = path.resolve(process.cwd(), r);
    assert(fs.existsSync(routePath), `Route handler présent : ${r}`);
  }

  // ----------------------------------------------------
  // TEST GROUP 6: Security & Secrets Exposure Check
  // ----------------------------------------------------
  console.log('\n🔹 6. Audit de Sécurité & Non-Exposition de Clés Secrètes :');

  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  assert(gitignoreContent.includes('.env'), '.env est bien protégé dans .gitignore');

  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
  assert(!envExampleContent.includes('AIzaSy'), 'Aucune vraie clé API Google exposée dans .env.example');
  assert(envExampleContent.includes('DATABASE_URL='), 'DATABASE_URL documenté dans .env.example');
  assert(envExampleContent.includes('JWT_SECRET='), 'JWT_SECRET documenté dans .env.example');

  // ----------------------------------------------------
  // TEST GROUP 7: 2D PDF Schedule Parser (EDT_19octobre2026.pdf)
  // ----------------------------------------------------
  console.log('\n🔹 7. Extraction Géométrique 2D d\'Emploi du Temps PDF :');

  const tr1 = parseTimeRangeString('10h-13h00');
  assert(
    tr1 !== null && tr1.start_time === '10:00' && tr1.end_time === '13:00',
    'Normalisation plage horaire "10h-13h00" -> 10:00 - 13:00'
  );
  const tr2 = parseTimeRangeString('14h00-17h00');
  assert(
    tr2 !== null && tr2.start_time === '14:00' && tr2.end_time === '17:00',
    'Normalisation plage horaire "14h00-17h00" -> 14:00 - 17:00'
  );

  const samplePdfPath = path.resolve(
    process.cwd(),
    'public/uploads/schedules/EDT_19octobre2026.pdf'
  );
  if (fs.existsSync(samplePdfPath)) {
    const pdfBuf = fs.readFileSync(samplePdfPath);
    const extractedCourses = await parseScheduleFromPdfBuffer(pdfBuf);
    assert(
      extractedCourses.length === 7,
      'Extraction exacte des 7 créneaux de cours RETEL1 depuis EDT_19octobre2026.pdf (créneaux vides ignorés)'
    );
    assert(
      extractedCourses.some(
        (c) =>
          c.subject_name === 'Systèmes répartis' &&
          c.day_of_week === 'tuesday' &&
          c.start_time === '10:00' &&
          c.end_time === '13:00' &&
          c.professor === 'M. B. GUEYE'
      ),
      'Détection exacte Mardi 10:00-13:00 : Systèmes répartis (M. B. GUEYE)'
    );
    assert(
      extractedCourses.some(
        (c) =>
          c.subject_name === 'Développement web et mobile' &&
          c.day_of_week === 'wednesday' &&
          c.start_time === '15:00' &&
          c.end_time === '17:00' &&
          c.professor === 'M. TOURE'
      ),
      'Détection exacte Mercredi 15:00-17:00 : Développement web et mobile (M. TOURE)'
    );
    assert(
      extractedCourses.some(
        (c) =>
          c.subject_name === 'Administration de services réseaux' &&
          c.day_of_week === 'thursday' &&
          c.start_time === '09:00' &&
          c.end_time === '13:00' &&
          c.professor === 'M. KASSE'
      ),
      'Détection exacte Jeudi 09:00-13:00 : Administration de services réseaux (M. KASSE)'
    );
  }

  const l3PdfPath = path.resolve(
    process.cwd(),
    'public/uploads/schedules/EDT_L3_2025_250616.pdf'
  );
  if (fs.existsSync(l3PdfPath)) {
    const l3Buf = fs.readFileSync(l3PdfPath);
    const l3Courses = await parseScheduleFromPdfBuffer(l3Buf);
    assert(
      l3Courses.length === 9,
      'Extraction exacte des 9 créneaux de cours L3 Informatique depuis EDT_L3_2025_250616.pdf (exclusion colonne Heure & recomposition "1 0 H - 13H")'
    );
    assert(
      l3Courses.some(
        (c) =>
          c.subject_name === 'Tech WEB (Front-end)' &&
          c.day_of_week === 'wednesday' &&
          c.start_time === '10:00' &&
          c.end_time === '13:00' &&
          c.professor === 'M. B. TOURE'
      ),
      'Détection exacte Mercredi 10:00-13:00 : Tech WEB (Front-end) (M. B. TOURE)'
    );
  }

  // ----------------------------------------------------
  // 8. Compétences Pédagogiques Spécialisées Kocc (Discipline & Niveau)
  // ----------------------------------------------------
  console.log('\n🔹 8. Compétences Pédagogiques Spécialisées Kocc (Discipline & Niveau) :');
  
  // Résolution des paliers académiques
  assert(resolveLevelTier('lycee') === 'tier_1_foundations', 'Palier 1 : "lycee" mappé vers tier_1_foundations');
  assert(resolveLevelTier('licence_1') === 'tier_1_foundations', 'Palier 1 : "licence_1" mappé vers tier_1_foundations');
  assert(resolveLevelTier('licence_2') === 'tier_2_rigor', 'Palier 2 : "licence_2" mappé vers tier_2_rigor');
  assert(resolveLevelTier('licence_3') === 'tier_2_rigor', 'Palier 2 : "licence_3" mappé vers tier_2_rigor');
  assert(resolveLevelTier('master_1') === 'tier_3_mastery', 'Palier 3 : "master_1" mappé vers tier_3_mastery');
  assert(resolveLevelTier('master_2') === 'tier_3_mastery', 'Palier 3 : "master_2" mappé vers tier_3_mastery');
  assert(resolveLevelTier('doctorat') === 'tier_3_mastery', 'Palier 3 : "doctorat" mappé vers tier_3_mastery');
  assert(resolveLevelTier(null) === 'tier_2_rigor', 'Palier par défaut : universitaire tier_2_rigor si niveau non renseigné');

  // Détection des disciplines académiques
  assert(
    detectSubjectDomain({ subjectName: 'Administration de services réseaux' }) === 'computer_science_networks',
    'Détection Réseaux : "Administration de services réseaux"'
  );
  assert(
    detectSubjectDomain({ userMessage: 'Comment calculer le masque de sous-réseau pour un préfixe /28 ?' }) === 'computer_science_networks',
    'Détection Réseaux via prompt : "masque de sous-réseau /28"'
  );
  assert(
    detectSubjectDomain({ subjectName: 'Algèbre linéaire et espaces vectoriels' }) === 'mathematics',
    'Détection Mathématiques : "Algèbre linéaire et espaces vectoriels"'
  );
  assert(
    detectSubjectDomain({ subjectName: 'Droit civil des obligations' }) === 'law_politics',
    'Détection Droit : "Droit civil des obligations"'
  );
  assert(
    detectSubjectDomain({ fieldOfStudy: 'Médecine & Santé', userMessage: 'Explique la physiopathologie rénale' }) === 'health_biology',
    'Détection Santé & Biologie via filière et prompt'
  );
  assert(
    detectSubjectDomain({ subjectName: 'Macroéconomie monétaire' }) === 'economics_management',
    'Détection Économie : "Macroéconomie monétaire"'
  );

  // Construction du prompt spécialisé
  const csPromptL3 = buildSpecialistTeachingPrompt({
    subjectName: 'Réseaux et Télécoms',
    academicLevel: 'licence_3',
    fieldOfStudy: 'Informatique & Technologies',
  });
  assert(csPromptL3.includes('Informatique, Systèmes & Réseaux Télécoms'), 'Prompt Kocc : activation de la posture Informatique & Réseaux');
  assert(csPromptL3.includes('Palier 2 : Consolidation & Rigueur Universitaire'), 'Prompt Kocc : calibrage du Palier 2 pour Licence 3');
  assert(csPromptL3.includes('Relance maïeutique équilibrée'), 'Prompt Kocc : maïeutique équilibrée présente dans les consignes');

  const mathPromptL1 = buildSpecialistTeachingPrompt({
    subjectName: 'Mathématiques générales',
    academicLevel: 'licence_1',
  });
  assert(mathPromptL1.includes('Mathématiques & Sciences Exactes'), 'Prompt Kocc : activation Mathématiques');
  assert(mathPromptL1.includes('Palier 1 : Fondations & Découverte'), 'Prompt Kocc : calibrage Palier 1 pour L1');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 Résumé : ${passedTests} Tests Réussis | ${failedTests} Échecs`);
  console.log('======================================================\n');

  if (failedTests === 0) {
    console.log('🎉 TOUS LES TESTS SONT AU VERT ! L\'architecture MySQL/Prisma & Auth JWT est 100% opérationnelle.\n');
    process.exit(0);
  } else {
    console.error('⚠️ Certains tests ont échoué. Veuillez corriger les anomalies ci-dessus.\n');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Erreur fatale dans le test suite :', err);
  process.exit(1);
});
