const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const slots = await prisma.revisionSlot.findMany({
    where: {
      OR: [
        { focusTopic: { contains: 'J+' } },
        { focusTopic: { contains: 'j+' } },
        { focusTopic: { contains: 'J +' } },
      ],
    },
  });

  console.log(`Trouvé ${slots.length} créneaux avec mention J+`);

  for (const slot of slots) {
    if (!slot.focusTopic) continue;

    let updated = slot.focusTopic
      .replace(/\[J\+0 Rappel immédiat\]/gi, 'Rappel immédiat')
      .replace(/\[J\+1 Consolidation\]/gi, 'Consolidation active')
      .replace(/\[J\+3 Application\]/gi, 'Application pratique')
      .replace(/\[J\+7 Courbe d'Ebbinghaus\]/gi, 'Ancrage mnésique')
      .replace(/\[J\+\d+[^\]]*\]/gi, '')
      .replace(/J\+\d+\s*[-:]?\s*/gi, '')
      .trim();

    if (updated.startsWith(':') || updated.startsWith('-')) {
      updated = updated.slice(1).trim();
    }

    await prisma.revisionSlot.update({
      where: { id: slot.id },
      data: { focusTopic: updated },
    });
    console.log(`Modifié : "${slot.focusTopic}" -> "${updated}"`);
  }

  console.log('Nettoyage des créneaux J+ terminé avec succès.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
