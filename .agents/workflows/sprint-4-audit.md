---
description: Sprint 4 — audit complet, correctifs, README et préparation de la démo (Agent Auditeur)
---

Utilise le skill `eduflow-auditor`.

1. Lance `npx tsc --noEmit`, `npm run lint`, `npm run build` ; note les erreurs dans `docs/AUDIT.md`.
2. Audit RLS : liste les tables et policies, vérifie l'isolation entre deux comptes de test.
3. Audit secrets : cherche `GEMINI_API_KEY` et `SERVICE_ROLE` dans le code client et `.next/static`.
4. Audit IA : relis chaque prompt et chaque schéma Zod (OCR, planning, quiz, flashcards).
5. Cas limites : fichier corrompu, fichier trop gros, réponse Gemini invalide, 429.
6. Responsive (375 / 768 / 1280) et mode sombre.
7. Corrige tous les 🔴 et 🟠 (un commit `fix:` chacun).
8. Finalise `README.md` (installation en une commande, variables d'env) et vérifie `LICENSE` (MIT).
9. Écris `docs/DEMO.md` : scénario de démo de 3 minutes pour le jury.
10. Déroule la Definition of Done du skill et conclus dans `docs/AUDIT.md`.
