# 🎓 EduFlow — Plateforme d'Assistance Éducative Intelligente

> **Événement :** Hackathon Open Source × AI 2026 (Galsen DEV / Hacktoberfest Dakar)  
> **Mode de Conception :** Orchestration par 3 Agents IA Collaboratifs  
> **Licence :** Open Source (MIT)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Auth-emerald?logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_%26_2.0_Flash-orange?logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 👥 Équipe Multi-Agents IA

| Agent | Rôle | Périmètre Technologique |
| :--- | :--- | :--- |
| **Agent 1** | **Backend & Data Engineer** | Supabase (PostgreSQL, Auth, Storage), API Routes Next.js, Gemini API (OCR, RAG, GenAI) |
| **Agent 2** | **Frontend & UI/UX Engineer** | Next.js App Router, Tailwind CSS, Shadcn/UI, React Native / Expo, State Management |
| **Agent 3** | **Auditor, QA & Lead Integrator** | Code Review, Audit RLS & Sécurité, Tests d'Intégration, Conformité Hackathon |

---

## ✨ Fonctionnalités Clés du MVP

1. **🔐 Authentification & Profil Académique (Module 1) :**
   - Inscription et connexion sécurisées via Supabase Auth.
   - Création automatique du profil via trigger PostgreSQL `on_auth_user_created`.
   - Paramétrage du niveau d'études, domaine et objectifs académiques.

2. **📸 OCR & Extraction d'Emploi du Temps par IA (Module 2) :**
   - Glisser-déposer de photos ou PDF d'emplois du temps.
   - Extraction structurée (jours, heures, salles, professeurs) avec **Gemini Vision**.
   - Affichage interactif dans un calendrier hebdomadaire réactif.

3. **📅 Générateur de Planning Intelligent de Révision (Module 3) :**
   - Algorithme IA croisant les créneaux libres de l'emploi du temps, les objectifs académiques et le volume de travail cible.
   - Zéro conflit d'horaires et répartition équilibrée avec temps de pause.

4. **💬 Assistant Pédagogique Intelligent & RAG (Module 4) :**
   - Chat interactif en temps réel avec streaming Server-Sent Events (SSE).
   - Contexte enrichi par les documents de cours de l'étudiant.
   - Rendu Markdown avec formules mathématiques KaTeX et coloration syntaxique de code.

5. **📚 Gestionnaire de Cours, Synthèse, Flashcards & Quiz (Modules 5 & 6) :**
   - Stockage sécurisé des cours dans Supabase Storage.
   - Synthèse automatique avec extraction de concepts clés.
   - Génération de cartes mémoires (flashcards) pour mémorisation active (active recall).
   - QCM interactifs auto-évalués avec explications détaillées.

6. **⏱️ Chronomètre Pomodoro & Statistiques (Module 7) :**
   - Sessions de travail et de pauses courtes/longues.
   - Historique et calcul automatique des minutes étudiées par jour et par semaine.

7. **📊 Tableau de Bord Centralisé (Module 8) :**
   - Synthèse de la journée : cours à venir, créneaux de révision, documents récents, séries d'étude (streak).

---

## ⚡ Lancement Rapide (Quickstart)

### 1. Cloner et Installer
```bash
git clone https://github.com/votre-org/eduflow.git
cd eduflow
npm install
```

### 2. Configurer l'Environnement
Copiez le modèle de configuration et renseignez vos clés :
```bash
cp .env.example .env.local
```

Variables requises dans `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anonyme
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role
GEMINI_API_KEY=votre-cle-gemini-api
```

### 3. Appliquer les Migrations Supabase
Copiez et exécutez le script SQL idempotent dans le **SQL Editor** de Supabase :
👉 `supabase/migrations/20261011000001_initial_schema.sql`

### 4. Démarrer le Serveur en Développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### 5. Démarrer avec Docker & Docker Compose
Pour déployer instantanément EduFlow et sa base MySQL 8 avec initialisation automatique :
```bash
docker compose up -d --build
```
- **Application Next.js :** [http://localhost:3000](http://localhost:3000)
- **Base MySQL :** `localhost:3306` (schéma et comptes pré-initialisés via `PRISMA_SEED=true`).

---

## 🧪 Tests & Audit Qualité

Pour exécuter la suite de tests et vérifier la conformité du projet :

```bash
# Vérification des types TypeScript stricts
npm run type-check

# Exécution de la suite de tests automatisés Backend & Sécurité
npm run test:backend

# Audit complet (Typecheck + Tests QA)
npm run audit

# Build de production Next.js
npm run build
```

---

## 🔒 Sécurité & Bonnes Pratiques

- **Row Level Security (RLS) :** Activée sur 100% des tables PostgreSQL pour empêcher toute fuite de données entre étudiants.
- **Zéro Clé Exposée :** La clé secrète `GEMINI_API_KEY` et `SUPABASE_SERVICE_ROLE_KEY` restent exclusivement sur le serveur.
- **Validation Zod :** Toutes les routes protégées valident rigoureusement les entrées pour éliminer les injections et payloads corrompus.
- **Tolérance aux Pannes IA :** Parsing défensif avec extraction par regex et retries automatiques pour les réponses JSON de Gemini.

---

## 📄 Licence

Ce projet est sous licence **MIT** — voir le fichier [LICENSE](file:///c:/workspace/dev/eduflow/LICENSE) pour plus de détails.
Projet développé pour le **Hackathon Open Source × AI 2026**.
