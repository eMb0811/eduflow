---
description: Sprint 1 — socle technique, base de données, auth et RLS (Agent Backend)
---

Utilise le skill `eduflow-backend`. Lis `docs/PRD.md` d'abord.

1. Initialise le projet si absent : `npx create-next-app@latest . --typescript --tailwind --app --eslint --import-alias "@/*"`.
2. Installe : `npm i @supabase/supabase-js @supabase/ssr @google/genai zod`.
3. Vérifie `.env.example` et `.gitignore`.
4. Écris `supabase/migrations/0001_init.sql` : tables, trigger `on_auth_user_created`, RLS, buckets `schedules` et `documents` avec policies.
5. Écris `types/database.ts` et `types/api.ts` (dont `ApiResponse<T>`).
6. Crée `lib/supabase/server.ts`, `lib/supabase/client.ts` et un helper `requireUser()` qui renvoie 401 sans session.
7. Implémente `GET/PUT /api/profile`.
8. `npx tsc --noEmit`, corrige, commit `feat: backend foundation`.
9. Écris `docs/HANDOFF.md` : routes disponibles, types exportés, variables d'env.
