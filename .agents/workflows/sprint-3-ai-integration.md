---
description: Sprint 3 — intégration Gemini (OCR, planning, chat, flashcards, quiz), backend puis frontend
---

Lis `docs/PRD.md` (modules 2 à 8) et `docs/HANDOFF.md`. Procède module par module, jamais deux à la fois.

Pour chaque module :
1. Skill `eduflow-backend` : route + schéma Zod de sortie + retry JSON + types mis à jour.
2. Skill `eduflow-frontend` : branche l'UI sur la vraie route, supprime les mocks correspondants.
3. Teste avec un vrai fichier / une vraie requête, note le résultat dans `docs/HANDOFF.md`.
4. `npx tsc --noEmit`, commit `feat(module-N): ...`.

Ordre :
- Module 2 : `POST /api/schedule/parse` (Gemini Vision) → dropzone + calendrier
- Module 3 : `POST /api/schedule/generate-planning` → vue planning + bouton régénérer
- Module 4 : `POST /api/ai/chat` en streaming → chat Markdown + KaTeX
- Module 5/6 : `/api/documents/summarize|flashcards|quiz` → modale, flashcards, quiz
- Module 7/8 : `/api/pomodoro` + `/api/pomodoro/stats` → stats du dashboard
