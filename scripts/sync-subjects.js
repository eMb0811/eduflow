const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Synchronisation des matières pour ${users.length} utilisateurs...`);

  for (const user of users) {
    const schedules = await prisma.scheduleEntry.findMany({
      where: { userId: user.id },
    });

    if (schedules.length === 0) continue;

    const uniqueNames = Array.from(new Set(schedules.map((s) => s.subjectName)));
    console.log(`Utilisateur ${user.email} : ${uniqueNames.length} matières uniques dans l'emploi du temps (${uniqueNames.join(', ')})`);

    for (const name of uniqueNames) {
      const sample = schedules.find((s) => s.subjectName === name);
      let subj = await prisma.subject.findFirst({
        where: { userId: user.id, name },
      });

      if (!subj) {
        subj = await prisma.subject.create({
          data: {
            userId: user.id,
            name,
            color: sample?.color || '#4F46E5',
            professor: sample?.professor || null,
          },
        });
        console.log(`  -> Créé Subject : "${name}" (${subj.id})`);
      } else {
        console.log(`  -> Existant Subject : "${name}" (${subj.id})`);
      }

      await prisma.scheduleEntry.updateMany({
        where: { userId: user.id, subjectName: name, subjectId: null },
        data: { subjectId: subj.id },
      });
    }
  }

  console.log('Synchronisation terminée avec succès.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
