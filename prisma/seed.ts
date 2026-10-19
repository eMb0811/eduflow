import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const prisma = new PrismaClient({
  datasources: process.env.DATABASE_URL ? { db: { url: process.env.DATABASE_URL } } : undefined,
});

async function main() {
  console.log('Seed DATABASE_URL:', process.env.DATABASE_URL);
  console.log('🌱 Démarrage du seed EduFlow MySQL...');

  const email = 'demo@eduflow.app';
  const rawPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  // Supprimer l'utilisateur de démo existant pour idempotence
  await prisma.user.deleteMany({
    where: { email },
  });

  // Création de l'utilisateur de démonstration
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'student',
      profile: {
        create: {
          email,
          fullName: 'Moussa Diop',
          academicLevel: 'Licence 3',
          fieldOfStudy: 'Informatique & Technologies',
          academicGoals: JSON.stringify(['grades', 'organization', 'exams']),
          onboardingCompleted: true,
        },
      },
      scheduleEntries: {
        create: [
          {
            subjectName: 'Algorithmique Avancée',
            dayOfWeek: 'monday',
            startTime: '08:30',
            endTime: '10:30',
            room: 'Amphi Turing',
            professor: 'Pr. Martin',
            color: '#3B82F6',
          },
          {
            subjectName: 'Bases de Données Relationnelles',
            dayOfWeek: 'monday',
            startTime: '14:00',
            endTime: '16:00',
            room: 'Salle B-204',
            professor: 'Dr. Benali',
            color: '#10B981',
          },
          {
            subjectName: 'Architecture des Ordinateurs',
            dayOfWeek: 'tuesday',
            startTime: '10:00',
            endTime: '12:00',
            room: 'Labo Info 2',
            professor: 'Mme. Rousseau',
            color: '#6366F1',
          },
          {
            subjectName: 'Mathématiques pour l\'Informatique',
            dayOfWeek: 'wednesday',
            startTime: '09:00',
            endTime: '11:30',
            room: 'Amphi 1',
            professor: 'Dr. Garnier',
            color: '#F59E0B',
          },
          {
            subjectName: 'Réseaux & Protocoles',
            dayOfWeek: 'thursday',
            startTime: '13:30',
            endTime: '16:30',
            room: 'Labo Réseau',
            professor: 'M. Moreau',
            color: '#EC4899',
          },
        ],
      },
      pomodoroSessions: {
        create: [
          {
            durationMinutes: 25,
            type: 'study',
            notes: 'Révision Arbres AVL',
            completedAt: new Date(Date.now() - 3600000 * 4),
          },
          {
            durationMinutes: 25,
            type: 'study',
            notes: 'Exercices SQL Normalisation',
            completedAt: new Date(Date.now() - 3600000 * 2),
          },
          {
            durationMinutes: 25,
            type: 'study',
            notes: 'Architecture RISC & Pipeline',
            completedAt: new Date(),
          },
        ],
      },
    },
  });

  await prisma.revisionPlan.create({
    data: {
      userId: user.id,
      title: 'Planning hebdomadaire de révision',
      isActive: true,
      slots: {
        create: [
          {
            userId: user.id,
            subjectName: 'Algorithmique Avancée',
            dayOfWeek: 'monday',
            startTime: '11:00',
            endTime: '12:30',
            focusTopic: 'Arbres binaires & complexité',
            priority: 'high',
            status: 'completed',
          },
          {
            userId: user.id,
            subjectName: 'Bases de Données',
            dayOfWeek: 'monday',
            startTime: '16:30',
            endTime: '18:00',
            focusTopic: 'Normalisation 3NF & SQL',
            priority: 'medium',
            status: 'pending',
          },
          {
            userId: user.id,
            subjectName: 'Architecture des Ordinateurs',
            dayOfWeek: 'tuesday',
            startTime: '14:00',
            endTime: '16:00',
            focusTopic: 'Pipeline RISC & Registres',
            priority: 'high',
            status: 'pending',
          },
        ],
      },
    },
  });

  console.log(`✅ Utilisateur de démonstration créé : ${user.email} (Mot de passe: ${rawPassword})`);

  // Création du Super Administrateur
  const adminEmail = 'admin@eduflow.app';
  const adminRawPassword = 'Password123!';
  const adminHash = await bcrypt.hash(adminRawPassword, salt);

  await prisma.user.deleteMany({
    where: { email: adminEmail },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: adminHash,
      role: 'superadmin',
      profile: {
        create: {
          email: adminEmail,
          fullName: 'Super Administrateur EduFlow',
          academicLevel: 'Doctorat',
          fieldOfStudy: 'Direction Pédagogique & Ingénierie',
          academicGoals: JSON.stringify(['organization', 'habits']),
          onboardingCompleted: true,
        },
      },
    },
  });

  console.log(`✅ Super Administrateur créé : ${adminUser.email} (Mot de passe: ${adminRawPassword})`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
