# EduFlow — Règles globales (toujours actives)

Projet : **EduFlow**, plateforme d'assistance éducative intelligente (Hackathon Open Source × AI 2026).
Source de vérité fonctionnelle : `docs/PRD.md`. En cas de doute, relis-le avant de coder.

## Stack imposée
- Next.js 14+ (App Router), TypeScript strict (`"strict": true`, pas de `any`)
- Supabase : Auth, PostgreSQL, Storage, RLS activé sur TOUTES les tables
- Gemini via `@google/genai` — le nom du modèle vient de `process.env.GEMINI_MODEL` (jamais en dur)
- Tailwind CSS + Shadcn/UI + Lucide, React Hook Form + Zod, TanStack Query, Zustand
- Mobile : Expo (React Native) + Expo Router, dossier `mobile/`

## Structure du repo
```
/app            → pages et API Routes Next.js
/components     → composants UI
/lib            → clients (supabase, gemini), utilitaires
/types          → database.ts, api.ts  (contrat partagé Backend → Frontend)
/supabase       → migrations SQL idempotentes : supabase/migrations/*.sql
/mobile         → app Expo
/docs           → PRD, HANDOFF.md, AUDIT.md, DEMO.md
```

## Routes API canoniques (ne pas en inventer d'autres)
| Module | Route |
|---|---|
| 1 | `GET/PUT /api/profile` |
| 2 | `POST /api/schedule/parse` |
| 3 | `POST /api/schedule/generate-planning` |
| 4 | `POST /api/ai/chat` (streaming) |
| 5-6 | `POST /api/documents/summarize`, `/flashcards`, `/quiz` |
| 7-8 | `POST /api/pomodoro`, `GET /api/pomodoro/stats` |

## Contrat d'interface
Toutes les routes répondent avec :
```ts
type ApiResponse<T> = { success: boolean; data?: T; error?: string; details?: Record<string, unknown> };
```
Les types vivent dans `/types/database.ts` et `/types/api.ts`. Le Frontend les importe, ne les redéfinit jamais.

## Sécurité (non négociable)
- `GEMINI_API_KEY` et `SUPABASE_SERVICE_ROLE_KEY` : uniquement côté serveur, jamais dans un composant client ni préfixés `NEXT_PUBLIC_`.
- Toute entrée utilisateur est validée avec Zod.
- Chaque route protégée vérifie la session Supabase et renvoie 401 sinon.
- Aucun secret committé. `.env.local` est dans `.gitignore`, `.env.example` est commité.

## Conventions
- Code, noms de variables, commits : anglais (Conventional Commits : `feat:`, `fix:`, `chore:`).
- Textes d'interface : français.
- Un module du PRD = une branche `feat/module-N-...`, jamais de commit direct sur `main`.
- Après chaque tâche : `npx tsc --noEmit` et `npm run lint`, corriger avant de continuer.
- Licence MIT, `README.md` à jour.

## Répartition des rôles
Utilise le skill correspondant au travail demandé :
- `eduflow-backend` → SQL, API Routes, Gemini, types
- `eduflow-frontend` → UI web et mobile
- `eduflow-auditor` → revue, sécurité, correctifs, conformité hackathon
Ne sors pas de ton périmètre : si tu as besoin d'un changement dans la couche d'un autre rôle, note-le dans `docs/HANDOFF.md`.
