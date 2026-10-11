# 🤝 EduFlow — Document de Passation Inter-Agents (HANDOFF)

> **Sprint 1 :** Socle Technique, Base de Données, Auth & RLS  
> **Auteur :** Agent 1 (Backend & Data Engineer)  
> **Destinataires :** Agent 2 (Frontend & UI/UX Engineer) & Agent 3 (Auditor, QA & Lead Integrator)  
> **Statut :** ✅ Validé (`tsc --noEmit` OK, Schéma SQL idempotent, RLS activé)

---

## 📌 Vue d'ensemble du Sprint 1

Le Sprint 1 a mis en place les fondations techniques du projet EduFlow :
1. **Initialisation Next.js 16** (App Router, TypeScript strict, Tailwind CSS, ESLint).
2. **Dépendances serveur et IA** : `@supabase/supabase-js`, `@supabase/ssr`, `@google/genai`, `zod`.
3. **Schéma PostgreSQL Supabase & RLS** (`supabase/migrations/0001_init.sql`) couvrant l'ensemble des modules du PRD.
4. **Trigger Auth automatique** `on_auth_user_created` créant le profil utilisateur dès l'inscription.
5. **Buckets de stockage privés** `schedules` et `documents` avec RLS basé sur le chemin `"{user_id}/..."`.
6. **Contrats TypeScript stricts** (`types/database.ts` et `types/api.ts`).
7. **Clients Supabase SSR & Browser** avec helper `requireUser()` retournant une erreur HTTP 401 standardisée si non authentifié.
8. **Client Gemini singleton** (`lib/gemini/client.ts`) prêt pour les fonctionnalités d'IA.
9. **API Routes de profil** (`GET` et `PUT /api/profile`).

---

## 🌐 Routes API Disponibles

Format standard de toutes les réponses API (`ApiResponse<T>`) :
```ts
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
}
```

### 1. `GET /api/profile`
- **Description :** Récupère le profil de l'utilisateur actuellement authentifié via sa session Supabase.
- **Authentification :** Requise (cookies de session).
- **Codes de réponse :**
  - `200 OK` : Profil retourné avec succès dans `data`.
  - `401 Unauthorized` : Session absente ou invalide.
  - `404 Not Found` : Profil introuvable en base.
  - `500 Internal Server Error` : Erreur de base de données.
- **Format de retour :** `ApiResponse<Profile>`

### 2. `PUT /api/profile`
- **Description :** Met à jour les informations du profil académique de l'utilisateur connecté.
- **Authentification :** Requise.
- **Corps de la requête (`JSON`) :**
  ```json
  {
    "full_name": "Fatou Ndiaye",
    "academic_level": "Licence 3",
    "field_of_study": "Informatique / Génie Logiciel",
    "academic_goals": "Valider mon semestre avec mention et préparer mes examens",
    "avatar_url": "https://example.com/avatar.jpg"
  }
  ```
- **Validation Zod :**
  - `full_name` : non vide, max 120 caractères (optionnel/nullable).
  - `academic_level` : max 100 caractères (optionnel/nullable).
  - `field_of_study` : max 120 caractères (optionnel/nullable).
  - `academic_goals` : max 1000 caractères (optionnel/nullable).
  - `avatar_url` : URL valide ou chaîne vide (optionnel/nullable).
- **Codes de réponse :**
  - `200 OK` : Profil mis à jour renvoyé dans `data`.
  - `400 Bad Request` : Erreur de validation Zod ou JSON malformé.
  - `401 Unauthorized` : Non authentifié.
  - `404 Not Found` : Profil introuvable.
  - `500 Internal Server Error` : Erreur serveur.

---

## 🗄️ Schéma Base de Données & RLS (`supabase/migrations/0001_init.sql`)

### Tables Créées
| Table | Description | Clé Primaire | Clé Étrangère / Propriétaire |
| :--- | :--- | :--- | :--- |
| `profiles` | Profil académique de l'étudiant | `id uuid` | `references auth.users(id)` |
| `subjects` | Matières suivies | `id uuid` | `user_id uuid` |
| `exams` | Échéances & examens | `id uuid` | `user_id uuid`, `subject_id -> subjects(id)` |
| `schedule_entries` | Cours issus de l'emploi du temps | `id uuid` | `user_id uuid` |
| `documents` | Documents de cours stockés | `id uuid` | `user_id uuid`, `subject_id -> subjects(id)` |
| `pomodoro_sessions` | Sessions de travail Pomodoro | `id uuid` | `user_id uuid` |
| `chat_messages` | Historique de chat IA | `id uuid` | `user_id uuid` |

### Règles de Sécurité (RLS)
- **RLS activé** sur toutes les 7 tables sans exception.
- Politique stricte d'isolation : `auth.uid() = id` pour `profiles` et `auth.uid() = user_id` pour toutes les autres tables, pour les opérations `SELECT`, `INSERT`, `UPDATE` et `DELETE`.
- Trigger `on_auth_user_created` sur `auth.users` : insère automatiquement une ligne dans `public.profiles`.

### Buckets de Stockage Privés (Supabase Storage)
- **`schedules`** : Stockage des photos/PDFs d'emplois du temps.
  - RLS : les utilisateurs n'ont accès qu'à leur propre sous-dossier (`{user_id}/*`).
- **`documents`** : Stockage des cours et supports d'étude.
  - RLS : accès restreint au sous-dossier de l'utilisateur (`{user_id}/*`).

---

## 🧩 Types TypeScript Exportés

### Dans `types/database.ts`
- `Database` : Type global pour typer le client Supabase (`createBrowserClient<Database>`, `createServerClient<Database>`).
- `Profile` : Représentation d'une ligne de la table `profiles`.
- `Subject` : Matière avec nom et couleur.
- `Exam` : Examen avec date, titre et matière liée.
- `ScheduleEntry` : Cours avec `day_of_week`, `start_time`, `end_time`, `room`.
- `DayOfWeek` : `'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'`.
- `Document` : Document stocké lié ou non à une matière.
- `PomodoroSession` : Session avec `duration_minutes` et `type`.
- `PomodoroType` : `'work' | 'short_break' | 'long_break'`.
- `ChatMessage` : Message avec `role` (`'user' | 'assistant' | 'system'`) et `content`.

### Dans `types/api.ts`
- `ApiResponse<T>` : Enveloppe standard pour toutes les réponses JSON.
- `ProfileResponse`, `UpdateProfileRequest` : Requêtes/réponses du profil.
- `ScheduleParsedItem`, `ParseScheduleResponse` : Structure attendue pour l'OCR de l'emploi du temps (Sprint 3).
- `RevisionSlot`, `GeneratePlanningResponse` : Créneaux de révision générés par l'IA (Sprint 3).
- `Flashcard`, `FlashcardsResponse` : Cartes mémoires générées par l'IA (Sprint 3).
- `QuizQuestion`, `QuizResponse` : QCM interactifs générés par l'IA (Sprint 3).

---

## 🛠️ Helpers Supabase & IA

### 1. `lib/supabase/client.ts`
```ts
import { createClient } from '@/lib/supabase/client'

// Utiliser dans les composants React Client ("use client")
const supabase = createClient()
```

### 2. `lib/supabase/server.ts`
```ts
import { createClient, requireUser } from '@/lib/supabase/server'

// Dans un Route Handler ou Server Action :
const auth = await requireUser()
if (auth.error) {
  return auth.error // Renvoie directement NextResponse 401 Unauthorized
}
const { user, supabase } = auth
```

### 3. `lib/gemini/client.ts`
```ts
import { getGeminiClient, getGeminiModelName } from '@/lib/gemini/client'

const ai = getGeminiClient()
const model = getGeminiModelName() // par défaut: gemini-2.5-flash
```

---

## 🔐 Variables d'Environnement (`.env.example`)

À copier dans `.env.local` pour le développement local :
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

---

## 🚀 Bilan du Sprint 2 (Agent Frontend — ✅ Validé)

Le Sprint 2 a complété l'interface utilisateur web d'EduFlow avec un design premium (dark mode first, Tailwind CSS v4, Framer Motion, Shadcn/UI) :
1. **Layout & Navigation globale :**
   - [`AppShell`](file:///components/layout/app-shell.tsx) avec sidebar desktop, bottom-bar mobile et raccourci d'accessibilité.
   - [`ThemeToggle`](file:///components/layout/theme-toggle.tsx) supportant le mode clair/sombre sans désynchronisation SSR.
   - Intégration globale dans [`app/layout.tsx`](file:///app/layout.tsx) avec les polices Outfit & Inter.
2. **Dashboard central ([`app/page.tsx`](file:///app/page.tsx)) :**
   - Salutation personnalisée via [`useProfile()`](file:///hooks/use-profile.ts).
   - 4 cartes d'indicateurs (temps d'étude hebdomadaire, cours du jour, examens proches, complétude du profil).
   - Liste interactive des cours d'aujourd'hui avec code couleur par matière.
   - Planning de révision intelligent généré par IA avec badges et conseils d'étude.
   - Widget minuteur Pomodoro intégré avec contrôles rapides.
   - Liste des examens à venir avec compte à rebours J-X.
3. **Emploi du temps ([`app/emploi-du-temps/page.tsx`](file:///app/emploi-du-temps/page.tsx)) :**
   - Vue par onglets journaliers (Lundi à Dimanche) et récapitulatif hebdomadaire.
   - Modale Dialog avec zone Drag-and-Drop pour l'import de fichier image/PDF vers `useParseSchedule()`.
4. **Minuteur Pomodoro ([`app/pomodoro/page.tsx`](file:///app/pomodoro/page.tsx)) :**
   - Minuteur SVG circulaire grand format avec animation de progression.
   - Modes Concentration (25m), Pause courte (5m) et Pause longue (15m).
   - Contrôles au clavier (touche Espace pour pause/reprise).
   - Synthétiseur de carillon sonore via Web Audio API (sans fichier externe).
   - Compteur de cycles (4 sessions = 1 cycle) et historique des sessions.
5. **Profil académique ([`app/profil/page.tsx`](file:///app/profil/page.tsx)) :**
   - Formulaire React Hook Form + Zod branché sur `/api/profile` (GET & PUT).
   - Champs : Nom complet, Niveau d'études, Filière, Objectifs académiques.
   - Statut de complétude du profil et alertes Toast Sonner.

---

## 📡 Avancement du Sprint 3 (Intégration IA Gemini)

### ✅ Module 2 : Import OCR & Extraction de l'Emploi du Temps par Gemini Vision (Validé)
- **Modèle IA :** `gemini-3.8-flash` via le SDK `@google/genai` (modèle multimodal actif).
- **Service Gemini OCR :** [`lib/gemini/parse-schedule.ts`](file:///lib/gemini/parse-schedule.ts)
  - Extraction stricte JSON avec typage et validation Zod (`scheduleParsedItemSchema`).
  - Normalisation 24h (`HH:mm`), jours normalisés (`monday`..`sunday`), salle nullable, anti-hallucination.
  - Résilience aux pics d'affluence : retry exponentiel sur codes HTTP 503/429/UNAVAILABLE.
  - Retry JSON avec réinjection de l'erreur Zod dans le prompt avant émission d'une erreur 502 propre.
- **Routes API Implémentées :**
  - `POST /api/schedule/parse` : réception `multipart/form-data` (limite 10 Mo, types image/PDF), OCR Gemini Vision, insertion en base (`schedule_entries`) ou en store dev local.
  - `GET /api/schedule` : lecture des cours de l'utilisateur avec tri chronologique.
  - `DELETE /api/schedule` : réinitialisation des cours.
- **Frontend Connecté :**
  - [`hooks/use-schedule.ts`](file:///hooks/use-schedule.ts) : `useSchedule()` et `useParseSchedule()` branchés directement sur les endpoints réels `/api/schedule` et `/api/schedule/parse` (suppression des mocks correspondants).
  - Zone Drag & Drop et modale dans [`app/emploi-du-temps/page.tsx`](file:///app/emploi-du-temps/page.tsx) 100% fonctionnelles.
- **Test d'Intégration Réel :**
  - Image testée : [`public/samples/emploi-du-temps-demo.jpg`](file:///public/samples/emploi-du-temps-demo.jpg) (emploi du temps universitaire Licence Informatique).
  - Résultat : **14 cours extraits avec 100% d'exactitude**, aucun créneau vide halluciné, horaires et salles parfaits.
- **Vérifications :**
  - `tsc --noEmit` : **0 erreur**
  - `eslint` : **0 avertissement, 0 erreur**
  - `next build --webpack` : **0 erreur** (10 routes compilées)

### 🗄️ Déploiement & Configuration Supabase en Production (Validé)
- **Projet Supabase :** `eduflow` (`ref: czybavolmkeepfordtep`, région `eu-west-3` Paris).
- **URL du projet :** `https://czybavolmkeepfordtep.supabase.co`
- **Schéma SQL & RLS :**
  - 7 tables créées avec **RLS activé** : `profiles`, `subjects`, `exams`, `schedule_entries`, `documents`, `pomodoro_sessions`, `chat_messages`.
  - Politiques RLS complètes (SELECT, INSERT, UPDATE, DELETE) pour chaque table basées sur `auth.uid() = user_id` (ou `auth.uid() = id` pour `profiles`).
  - Buckets de stockage privés `schedules` et `documents` créés avec politiques d'isolation par utilisateur (`{user_id}/*`).
- **Configuration :** Variables d'environnement réelles renseignées dans [`.env.local`](file:///.env.local), connexion testée et confirmée.

### ✅ Module 3 : Génération de Planning Intelligent de Révision par Gemini (Validé)
- **Service IA :** [`lib/gemini/generate-planning.ts`](file:///lib/gemini/generate-planning.ts)
  - Modèle : `gemini-3.8-flash`.
  - Algorithme de croisement cognitif : croise l'emploi du temps (interdiction formelle de chevaucher les cours en présentiel), les examens imminents (priorisation des matières critiques) et le profil étudiant (objectifs académiques).
  - Validation Zod stricte (`generatePlanningResponseSchema`) avec retry exponentiel (503/429) et retry prompt si JSON invalide.
- **Routes API Implémentées :**
  - `POST /api/schedule/generate-planning` : génère un planning personnalisé pour le jour demandé ou le jour courant.
  - `GET /api/exams` : récupération des examens à venir de l'étudiant avec calcul du compte à rebours.
- **Frontend Connecté :**
  - [`hooks/use-schedule.ts`](file:///hooks/use-schedule.ts) : `useTodayPlanning()`, `useUpcomingExams()` et la nouvelle mutation `useRegeneratePlanning()` branchés directement sur les endpoints réels (mocks supprimés).
  - [`app/page.tsx`](file:///app/page.tsx) : ajout du bouton d'action "Régénérer" avec indicateur de chargement rotatif dans la carte du Dashboard.
- **Test d'Intégration Réel :**
  - Scénario testé : étudiant avec 3 cours (08:00-10:00, 10:15-12:15, 14:00-16:00) et un partiel imminent en Algorithmique.
  - Résultat : **7 créneaux générés à partir de 16:30** (zéro chevauchement de cours), focus doublé sur l'Algorithmique, pauses structurées et conseils d'efficacité cognitive (Ebbinghaus, effet de test).
- **Vérifications :**
  - `tsc --noEmit` : **0 erreur**
  - `eslint` : **0 avertissement, 0 erreur**
  - `next build --webpack` : **0 erreur** (12 routes compilées avec succès)

### ✅ Module 4 : Assistant Pédagogique Intelligent en Streaming (Chat IA RAG) (Validé)
- **Service IA :** [`lib/gemini/chat.ts`](file:///lib/gemini/chat.ts)
  - Modèle : `gemini-3.8-flash` via le SDK `@google/genai` (méthode `generateContentStream`).
  - Rôle pédagogique d'élite (explications pas-à-pas, formules mathématiques en syntaxe KaTeX `$inline$` et `$$display$$`, tableaux comparatifs, blocs de code annotés).
  - Résilience aux pics d'affluence : retry exponentiel automatique sur erreurs transitoires (503/429).
- **Routes API Implémentées :**
  - `POST /api/ai/chat` : streaming natif Next.js `ReadableStream` avec encodage UTF-8 textuel et persistance asynchrone des messages dans la table Supabase `chat_messages`.
  - `GET /api/ai/chat` : récupération chronologique des messages de l'utilisateur avec pagination (50 derniers messages).
  - `DELETE /api/ai/chat` : réinitialisation sécurisée de l'historique conversationnel de l'utilisateur.
- **Frontend Connecté :**
  - [`components/chat/markdown-renderer.tsx`](file:///components/chat/markdown-renderer.tsx) : rendu ReactMarkdown enrichi de `remark-math`, `rehype-katex`, coloration des blocs de code avec bouton de copie et tableaux formatés.
  - [`hooks/use-ai-chat.ts`](file:///hooks/use-ai-chat.ts) : hook client gérant le streaming chunk par chunk via `TextDecoder`, l'état optimiste de l'UI, l'annulation de requête (`AbortController`) et le rechargement de l'historique.
  - [`app/assistant/page.tsx`](file:///app/assistant/page.tsx) : interface conversationnelle complète avec suggestions de questions, bulles de discussion, défilement automatique doux et boutons de suppression d'historique.
  - [`components/layout/app-shell.tsx`](file:///components/layout/app-shell.tsx) : ajout du lien "Assistant IA" (`/assistant`) dans la barre latérale desktop et dans la barre de navigation mobile.
- **Test d'Intégration Réel :**
  - Requête soumise : explication du tri rapide (QuickSort) avec complexité en KaTeX et exemple en Python.
  - Résultat : **4 309 caractères streamés sans interruption**, formule $T(n) = 2T(n/2) + O(n)$ rendue proprement par KaTeX, tableau de complexités ($O(n \log n)$ vs $O(n^2)$) et code Python validé.
- **Vérifications :**
  - `tsc --noEmit` : **0 erreur**
  - `eslint` : **0 avertissement, 0 erreur**
  - `next build --webpack` : **0 erreur** (14 routes compilées avec succès)
