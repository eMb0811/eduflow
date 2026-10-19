# 🛠️ EduFlow — Backend & Data Architecture

> **Projet :** EduFlow — Plateforme d'Assistance Éducative Intelligente  
> **Événement :** Hackathon Open Source × AI 2026 (Galsen DEV / Hacktoberfest Dakar)  
> **Auteur :** Agent 1 (Backend & Data Engineer)

---

## 🏗️ 1. Vue d'Ensemble & Stack Technique

Le backend d'EduFlow est conçu pour offrir haute performance, sécurité stricte et intégration native avec l'intelligence artificielle de pointe Google Gemini et la plateforme de données Supabase.

| Composant | Technologie | Rôle & Justification |
| :--- | :--- | :--- |
| **Framework Serveur** | Next.js 14+ (App Router) | API Routes serveur haute performance, Server Actions, streaming SSE |
| **Base de Données** | Supabase (PostgreSQL) | Stockage relationnel ACID, typage strict, extensions UUID |
| **Sécurité & Accès** | Row Level Security (RLS) | Isolation hermétique des données étudiantes par `user_id` |
| **Authentification** | Supabase Auth (JWT) | Support double : Session Cookies (Web) + Bearer Token (Mobile / CLI) |
| **Stockage Fichiers** | Supabase Storage | Buckets sécurisés `schedules` et `documents` avec règles RLS |
| **Moteurs d'IA** | Google Gemini (`@google/generative-ai` & `@google/genai`) | OCR Vision, RAG documentaire, Synthèse, Flashcards, Quiz, Chat SSE |
| **Validation** | Zod (TypeScript) | Validation stricte des entrées utilisateurs et structured output IA |

---

## 🗄️ 2. Schéma de Base de Données & RLS

Le fichier de migration SQL idempotent est situé à :  
👉 `supabase/migrations/20261011000001_initial_schema.sql`

### Tables Principales :
1. **`profiles`** : Profil académique (`id`, `email`, `full_name`, `academic_level`, `field_of_study`, `academic_goals`, `avatar_url`).
   - Trigger automatique `on_auth_user_created` créant le profil dès l'inscription via Supabase Auth.
   - RLS : Accès en lecture/écriture restreint à `auth.uid() = id`.
2. **`subjects`** : Matières académiques (`id`, `user_id`, `name`, `code`, `color`, `coefficient`, `professor`).
3. **`schedule_entries`** : Emploi du temps extrait par OCR/IA (`id`, `user_id`, `subject_name`, `day_of_week`, `start_time`, `end_time`, `room`, `professor`, `color`).
4. **`revision_plans` & `revision_slots`** : Planning intelligent de révision généré par Gemini sans chevauchement avec les cours.
5. **`chat_sessions` & `chat_messages`** : Historique conversationnel avec le tuteur IA pédagogique (support RAG document).
6. **`documents`** : Cours uploadés (`id`, `user_id`, `title`, `file_url`, `file_path`, `extracted_text`, `summary`, `key_concepts`).
7. **`flashcards`** : Cartes mémoires générées pour apprentissage actif (active recall).
8. **`quizzes` & `quiz_questions`** : QCM interactifs (4 options, réponse correcte, explications détaillées).
9. **`pomodoro_sessions`** : Sessions d'étude et de pauses chronométrées avec calcul de statistiques.

### Buckets de Stockage Supabase :
- **`schedules`** : Stockage des photos et PDF d'emplois du temps (max 10 Mo).
- **`documents`** : Stockage des cours et supports de révision (max 20 Mo).
- Politiques RLS Storage : Chaque étudiant accède strictement à son répertoire `[user_id]/*`.

---

## 🤖 3. Intégration IA Google Gemini

L'intégration IA est centralisée dans `lib/ai/gemini.ts` et `lib/ai/prompts.ts` :

1. **OCR Emploi du Temps (`POST /api/schedule/parse`)** :
   - Analyse d'images (PNG, JPEG, WEBP) ou PDF via `analyzeMediaWithVision`.
   - Modèle : `gemini-1.5-flash` ou `gemini-2.0-flash`.
   - Extraction JSON strict validé par Zod (`day_of_week`, `start_time`, `end_time`, `subject_name`, `room`).
   - Mécanisme de fallback et nettoyage des blocs Markdown JSON.
2. **Générateur de Planning Intelligent (`POST /api/schedule/generate-planning`)** :
   - Algorithme croisant les créneaux occupés, les objectifs de l'étudiant et le volume de travail souhaité.
   - Garantie d'absence de chevauchement avec les cours existants.
3. **Assistant Pédagogique Streaming (`POST /api/ai/chat`)** :
   - Mode conversationnel en streaming temps réel via **Server-Sent Events (SSE)** (`ReadableStream`).
   - Support RAG : Injection contextuelle des cours et résumés dans le prompt système.
   - Rendu adapté aux formules mathématiques (LaTeX) et blocs de code.
4. **Synthèse & Générateur de Contenus Pédagogiques** :
   - `POST /api/documents/summarize` : Résumé structuré avec concepts clés.
   - `POST /api/documents/flashcards` : Cartes mémoire atomiques avec notation de difficulté.
   - `POST /api/documents/quiz` : Quiz QCM 4 choix avec explications.
   - `POST /api/documents/quiz/submit` : Notation instantanée et calcul de score.

---

## 🌐 4. Référence Complète des Endpoints d'API

Format standard des réponses :
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
}
```

### Module 1 : Authentification & Profil
- `GET /api/profile` : Récupère le profil de l'utilisateur connecté.
- `PUT /api/profile` : Met à jour les informations académiques.

### Module 2 : Emploi du Temps & OCR
- `POST /api/schedule/parse` : Traitement OCR d'une image/PDF d'emploi du temps via Gemini Vision.
- `GET /api/schedule` : Liste des cours hebdomadaires de l'étudiant.
- `POST /api/schedule` : Ajout manuel ou sauvegarde par lot de cours.
- `PATCH /api/schedule/:id` : Modification d'un créneau de cours.
- `DELETE /api/schedule/:id` : Suppression d'un créneau de cours.

### Module 3 : Planning de Révision
- `POST /api/schedule/generate-planning` : Génération du planning intelligent par Gemini.
- `GET /api/schedule/planning` : Récupération du planning hebdomadaire actif.

### Module 4 : Assistant Pédagogique IA
- `POST /api/ai/chat` : Envoi d'un message au tuteur (réponse SSE en streaming ou JSON).
- `GET /api/ai/chat` & `GET /api/ai/chat/history` : Récupération de l'historique de discussion.

### Modules 5 & 6 : Documents, Flashcards & Quiz
- `GET /api/documents` : Liste des cours et documents.
- `POST /api/documents` : Enregistrement des métadonnées d'un cours uploadé.
- `GET /api/documents/:id` : Détail d'un document.
- `DELETE /api/documents/:id` : Suppression d'un document et de son fichier dans Storage.
- `POST /api/documents/summarize` : Génération d'une synthèse de cours avec concepts clés.
- `GET /api/documents/flashcards` : Liste des cartes mémoires de l'étudiant.
- `POST /api/documents/flashcards` : Génération automatique de flashcards par Gemini.
- `GET /api/documents/quiz` : Liste des quiz générés avec leurs questions.
- `POST /api/documents/quiz` : Création automatique d'un QCM via Gemini.
- `POST /api/documents/quiz/submit` : Soumission des réponses du quiz et calcul du score.

### Modules 7 & 8 : Pomodoro & Tableau de Bord Central
- `GET /api/pomodoro` : Statistiques d'étude (minutes du jour, de la semaine, sessions récentes).
- `POST /api/pomodoro` : Enregistrement d'une session terminée.
- `PUT /api/pomodoro/:id/complete` : Clôture d'une session Pomodoro en cours.
- `GET /api/stats` : Statistiques consolidées (série de jours d'étude consécutifs / streak).
- `GET /api/dashboard` & `GET /api/dashboard/stats` : Synthèse complète pour le Dashboard principal.

### Santé & Monitoring
- `GET /api/health` : État de santé des services (Supabase & Gemini API).

---

## 🔒 5. Sécurité & Authentification Duale

Le résolveur d'authentification (`lib/auth/get-user.ts`) gère automatiquement :
1. **Sessions Cookies Web** : Pour les composants Next.js App Router (Client et Server Components).
2. **Bearer Token HTTP (`Authorization: Bearer <JWT>`)** : Pour l'application mobile Expo / React Native ou les appels automatisés de tests (Postman / scripts QA).

---

## 🚀 6. Guide de Démarrage Rapide

1. **Variables d'environnement :**
   Copiez `.env.example` en `.env.local` et renseignez les clés :
   ```bash
   cp .env.example .env.local
   ```
2. **Lancer les migrations Supabase :**
   Exécutez le script SQL `supabase/migrations/20261011000001_initial_schema.sql` dans le SQL Editor de votre projet Supabase.
3. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
4. **Tester le typecheck TypeScript :**
   ```bash
   npm run type-check
   ```
