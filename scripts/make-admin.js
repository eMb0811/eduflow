const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emails = ['elhadjibarry2001@gmail.com', 'demo@eduflow.app'];
  for (const email of emails) {
    const updated = await prisma.user.updateMany({
      where: { email },
      data: { role: 'admin' },
    });
    console.log(`Updated ${email} to admin: ${updated.count} record(s)`);
  }
}

main().finally(() => prisma.$disconnect());
