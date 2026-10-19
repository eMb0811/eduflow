# 📋 PRD EduFlow MVP — Architecture & Répartition Multi-Agents IA

> **Projet :** EduFlow — Plateforme d'Assistance Éducative Intelligente  
> **Événement :** Hackathon Open Source × AI 2026 (Galsen DEV / Hacktoberfest Dakar)  
> **Mode d'Exécution :** Orchestration par 3 Agents IA Collaboratifs

---

## 👥 Équipe Multi-Agents IA

| Agent | Rôle | Périmètre Technologique |
| :--- | :--- | :--- |
| **Agent 1** | **Backend & Data Engineer** | Supabase (Auth, PostgreSQL, Storage), Next.js API Routes, Gemini API (OCR, RAG, GenAI) |
| **Agent 2** | **Frontend & UI/UX Engineer** | Next.js App Router, Tailwind CSS, Shadcn/UI, React Native / Expo, State Management |
| **Agent 3** | **Auditor, QA & Lead Integrator** | Code Review, Audit RLS & Sécurité, Correction de bugs, Conformité Hackathon, Testing |

---

## 🎯 Répartition Explicite des Tâches par Module MVP

### Module 1 : Authentification & Profil Académique
- **Agent Backend (Agent 1) :**
  - Script SQL : Table `profiles` (`id`, `full_name`, `academic_level`, `field_of_study`, `academic_goals`).
  - Trigger Supabase Auth `on_auth_user_created` pour auto-créer le profil.
  - API Route `GET/PUT /api/profile`.
- **Agent Frontend (Agent 2) :**
  - Écran d'onboarding & formulaire de configuration du profil (React Hook Form + Zod).
  - Composant carte de profil dans le Dashboard.
- **Agent Auditeur (Agent 3) :**
  - Validation du RLS Supabase (`auth.uid() = id`).
  - Test de redirection après authentification.

---

### Module 2 : Import OCR & Extraction de l'Emploi du Temps par IA
- **Agent Backend (Agent 1) :**
  - Bucket Supabase Storage `schedules`.
  - API Route `POST /api/schedule/parse` : Réception d'une image/PDF, envoi à **Gemini Vision**, extraction JSON strict (`subject`, `day_of_week`, `start_time`, `end_time`, `room`).
  - Inserteur SQL pour la table `schedule_entries`.
- **Agent Frontend (Agent 2) :**
  - Composant d'upload (Dropzone drag-and-drop).
  - Vue Emploi du Temps / Calendrier hebdomadaire interactif récapitulant les cours extraits.
- **Agent Auditeur (Agent 3) :**
  - Validation du prompt Gemini pour éviter les mauvaises extractions de jours/heures.
  - Gestion des cas de fichiers illisibles ou corrompus.

---

### Module 3 : Génération de Planning Intelligent de Révision
- **Agent Backend (Agent 1) :**
  - Algorithme de croisement entre les créneaux libres de l'emploi du temps, les objectifs et les examens à venir.
  - API Route `POST /api/schedule/generate-planning` alimentée par Gemini.
- **Agent Frontend (Agent 2) :**
  - Vue récapitulative du planning quotidien avec blocs de révision/pause colorés.
  - Bouton d'action "Régénérer mon planning de la semaine".
- **Agent Auditeur (Agent 3) :**
  - Vérification de la cohérence temporelle (aucun chevauchement de plages horaires).

---

### Module 4 : Assistant Pédagogique Intelligent (Chat IA RAG)
- **Agent Backend (Agent 1) :**
  - Table `chat_messages` (`id`, `user_id`, `role`, `content`, `created_at`).
  - API Route `POST /api/ai/chat` exploitant Gemini API en mode conversationnel streaming.
- **Agent Frontend (Agent 2) :**
  - Interface de Chat temps réel avec bulles de messages, indicateur d'écriture (typing effect).
  - Rendu Markdown et formules LaTeX.
- **Agent Auditeur (Agent 3) :**
  - Audit de performance pour éviter la latence d'affichage.
  - Sécurisation du contexte conversationnel.

---

### Module 5 & 6 : Gestionnaire de Cours & Interactions Documentaires (RAG, Flashcards, Quiz)
- **Agent Backend (Agent 1) :**
  - Bucket Supabase Storage `documents`.
  - Table `documents` (`id`, `user_id`, `title`, `file_url`, `subject_id`).
  - API Routes :
    - `POST /api/documents/summarize` (Résumé automatique par Gemini)
    - `POST /api/documents/flashcards` (Génération de cartes mémoire au format JSON)
    - `POST /api/documents/quiz` (Génération d'un quiz QCM interactif JSON)
- **Agent Frontend (Agent 2) :**
  - Modale d'interaction sur le cours.
  - Composant de cartes mémoire réversibles (Flashcards Flip Animation).
  - Composant Quiz interactif avec calcul de score instantané.
- **Agent Auditeur (Agent 3) :**
  - Contrôle du schéma JSON renvoyé par Gemini pour les quiz et flashcards.

---

### Module 7 & 8 : Pomodoro & Tableau de Bord Central
- **Agent Backend (Agent 1) :**
  - Table `pomodoro_sessions` (`id`, `user_id`, `duration_minutes`, `type`, `completed_at`).
  - Endpoints d'enregistrement des statistiques d'étude.
- **Agent Frontend (Agent 2) :**
  - Widget Minuteur Pomodoro (Play/Pause/Reset, sons de notification).
  - Tableau de bord principal regroupant : résumé de la journée, statistiques de travail, cours à venir.
- **Agent Auditeur (Agent 3) :**
  - Audit UX global, test de réactivité responsive.

---

## 🔄 Plan d'Exécution en 4 Sprints

```
Sprint 1 : Socle Technique & Base de Données (Agent 1)
   └── Sprint 2 : Interfaces UI & Composants Core (Agent 2)
          └── Sprint 3 : Intégrations Gemini IA & Workflows (Agent 1 + Agent 2)
                 └── Sprint 4 : Audit, Bug Fixes & Preparation Demo (Agent 3)
```

1. **Sprint 1 — Fondations (Agent Backend) :** Mise en place Supabase, schéma BDD, Auth & RLS, API Routes de base.
2. **Sprint 2 — Interfaces (Agent Frontend) :** Design du Dashboard, formulaires, composants Shadcn/UI, écran d'import.
3. **Sprint 3 — Intégration IA (Backend + Frontend) :** OCR Emploi du Temps, Chat RAG, Générateur de Quiz/Flashcards.
4. **Sprint 4 — Audit & Recette (Agent Auditeur) :** Correction des bugs de typage, audit de sécurité, validation du `README.md` et préparation de la démo pour le jury.
