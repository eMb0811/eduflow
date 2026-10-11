---
description: Sprint 2 — interfaces, composants core et dashboard (Agent Frontend)
---

Utilise le skill `eduflow-frontend`. Lis `docs/PRD.md` et `docs/HANDOFF.md`.

1. `npx shadcn@latest init`, puis ajoute : card, dialog, tabs, badge, progress, skeleton, sonner, form, input, button.
2. Installe : `npm i @tanstack/react-query zustand react-hook-form @hookform/resolvers framer-motion lucide-react react-markdown remark-math rehype-katex`.
3. Layout global : navigation (sidebar desktop / bottom bar mobile), thème clair/sombre, `QueryClientProvider`.
4. Onboarding + formulaire profil branchés sur `/api/profile`.
5. Dashboard : résumé du jour, stats, prochains cours (données réelles ou mocks dans `lib/mocks/`).
6. Dropzone d'import + calendrier hebdomadaire (squelette).
7. Widget Pomodoro complet, timers nettoyés au démontage.
8. `npx tsc --noEmit` + `npm run lint`, commit `feat: ui core`.
9. Mets à jour `docs/HANDOFF.md` avec les routes dont l'UI dépend encore.
