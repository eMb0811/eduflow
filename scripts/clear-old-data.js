const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Nettoyage complet des anciennes données de test EduFlow ---');

  // 1. Suppression des créneaux et plannings de révision
  const delSlots = await prisma.revisionSlot.deleteMany({});
  console.log(`- Créneaux de révision supprimés : ${delSlots.count}`);

  const delPlans = await prisma.revisionPlan.deleteMany({});
  console.log(`- Plannings de révision supprimés : ${delPlans.count}`);

  // 2. Suppression des questions de quiz et quiz
  const delQuestions = await prisma.quizQuestion.deleteMany({});
  console.log(`- Questions de quiz supprimées : ${delQuestions.count}`);

  const delQuizzes = await prisma.quiz.deleteMany({});
  console.log(`- Quiz supprimés : ${delQuizzes.count}`);

  // 3. Suppression des flashcards
  const delCards = await prisma.flashcard.deleteMany({});
  console.log(`- Flashcards supprimées : ${delCards.count}`);

  // 4. Suppression des documents
  const delDocs = await prisma.document.deleteMany({});
  console.log(`- Documents supprimés : ${delDocs.count}`);

  // 5. Suppression des cours de l'emploi du temps
  const delEntries = await prisma.scheduleEntry.deleteMany({});
  console.log(`- Cours d'emploi du temps supprimés : ${delEntries.count}`);

  // 6. Suppression de l'historique de chat Kocc
  const delMsgs = await prisma.chatMessage.deleteMany({});
  console.log(`- Messages de chat supprimés : ${delMsgs.count}`);

  const delSessions = await prisma.chatSession.deleteMany({});
  console.log(`- Sessions de chat supprimées : ${delSessions.count}`);

  // 7. Suppression des sessions Pomodoro
  const delPomo = await prisma.pomodoroSession.deleteMany({});
  console.log(`- Sessions Pomodoro supprimées : ${delPomo.count}`);

  // 8. Suppression des matières (Subject)
  const delSubj = await prisma.subject.deleteMany({});
  console.log(`- Matières supprimées : ${delSubj.count}`);

  // 9. Nettoyage des dossiers de fichiers téléversés
  const uploadFolders = [
    path.join(__dirname, '..', 'public', 'uploads', 'documents'),
    path.join(__dirname, '..', 'public', 'uploads', 'schedules'),
  ];

  for (const folder of uploadFolders) {
    if (fs.existsSync(folder)) {
      const files = fs.readdirSync(folder);
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(folder, file));
        }
      }
      console.log(`- Nettoyage du dossier ${path.basename(folder)} : ${files.length} fichiers purgés`);
    }
  }

  // Vérifier les utilisateurs conservés
  const users = await prisma.user.findMany({
    select: { id: true, email: true, profile: { select: { fullName: true } } },
  });
  console.log('Utilisateurs conservés pour connexion :', users);

  console.log('--- Nettoyage terminé avec succès ! Base de données remise à zéro. ---');
}

main()
  .catch((e) => {
    console.error('Erreur lors du nettoyage :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
