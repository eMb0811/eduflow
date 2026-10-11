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

## 🚀 Consignes pour le Sprint 2 (Agent Frontend — `/sprint-2-frontend`)

1. **Pages & Navigation :**
   - Implémenter l'onboarding et l'édition du profil en appelant `GET/PUT /api/profile`.
   - Utiliser `lib/supabase/client.ts` pour gérer la session et l'authentification (login / signup / logout).
2. **Composants UI :**
   - Utiliser Tailwind CSS et les primitives Shadcn/UI configurées dans `components.json`.
   - Utiliser les types importés de `@/types/database` et `@/types/api`.
3. **Esthétique :**
   - Respecter les directives de design premium (mode sombre élégant, accents vibrants, micro-animations, typographie soignée).
