---
name: anti-vibe-coding
description: >-
  Directives strictes de design, de rédaction et checklist obligatoire de pré-lancement pour EduFlow.
  À activer impérativement lors de toute conception d'interface, intégration de composants, revue UI/UX
  et préparation à la mise en production pour éviter tout aspect "vibe codé" ou générique.
---

# 🛡️ Anti-Vibe Coding & Launch Standards — EduFlow

Ce skill définit les règles strictes de design visuel, d'expérience utilisateur (UX), de rédaction éditoriale et les prérequis obligatoires de mise en production pour l'application **EduFlow**.

L'objectif est de garantir un produit à l'aspect fini, professionnel, crédible et mature, loin des clichés visuels des projets générés par IA ("vibe codés").

---

## 🎨 1. Règles de Design Visuel & UI (Zéro Vibe Coding)

### ❌ Interdictions strictes :
1. **Jamais de dégradés violet / pourpre génériques :**
   - Interdiction des dégradés artificiels saturés (ex. `bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500` ou fonds violets néon).
   - Privilégier une palette sobre, structurée et équilibrée : ardoise / slate, zinc, fonds neutres profonds, avec des touches de couleur fonctionnelles et mesurées.
2. **Jamais de boutons en forme de pilule :**
   - Ne pas utiliser `rounded-full` pour les boutons (`Button`, CTA, filtres).
   - Utiliser des rayons de courbure modernes et discrets : `rounded-md` (6px) ou `rounded-lg` (8px).
3. **Pas d'émojis en guise d'icônes d'interface :**
   - Ne jamais utiliser d'émojis système (ex. 🚀, 💡, 🔥, 👋, 📚, ✨) dans la navigation, les boutons ou les titres.
   - Utiliser exclusivement des icônes vectorielles cohérentes de la bibliothèque [Lucide React](https://lucide.dev) (`lucide-react`).
4. **Pas d'animations de scroll exagérées :**
   - Bannir les effets de parallaxe lourds, les éléments qui glissent de travers au scroll ou les transitions retardées qui freinent l'utilisateur.
   - Privilégier des transitions instantanées ou discrètes (150ms à 200ms) axées sur la fluidité et l'utilisabilité.

---

## ✍️ 2. Standards de Rédaction & Typographie

1. **Pas de hero text vague ou grandiloquent :**
   - Bannir les formules creuses type *"Révolutionnez votre futur académique grâce à la puissance infinie de l'IA"*.
   - Rédiger des titres directs, factuels et orientés bénéfice concret pour l'étudiant (ex. *"Générez votre planning de révision à partir de votre emploi du temps"*).
2. **Pas d'em-dashes (tirets cadratins `—`) abusifs :**
   - Éviter la ponctuation artificielle surutilisée dans les contenus générés par IA.
   - Employer des phrases simples, rythmées et directes.

---

## 🚀 3. Checklist Obligatoire de Pré-Lancement (Launch Gate)

Aucun déploiement public ou mise en production officielle ne doit être validé tant que **l'intégralité** des points suivants n'est pas cochée :

- [ ] **Nom de domaine personnalisé branché :**  
  Le service doit être accessible via un domaine personnalisé propre (ex. `eduflow.app` ou domaine dédié configuré), sans sous-domaine temporaire ou URL brute de plateforme d'hébergement.
- [ ] **Favicon et icônes d'application en place :**  
  Présence d'un ensemble complet d'icônes d'onglet (`favicon.ico`, `icon.png`, `apple-touch-icon.png`) cohérentes avec la charte graphique.
- [ ] **Suppression totale du tag "Made with AI" :**  
  Aucun badge, mention en pied de page ou texte indiquant *"Made with AI"*, *"Généré par l'IA"* ou *"Built with V0/Lovable/Bolt"*.
- [ ] **Page de Politique de Confidentialité :**  
  Route active (ex. `/privacy` ou `/politique-de-confidentialite`) détaillant le traitement des données des étudiants, l'hébergement et le respect de la vie privée.
- [ ] **Page des CGU (Conditions Générales d'Utilisation) :**  
  Route active (ex. `/terms` ou `/cgu`) encadrant l'utilisation du service et des fonctionnalités d'assistance pédagogique.

---

## 📋 Procédure de Vérification pour l'Agent

Lorsqu'une page ou un composant est créé ou audité :
1. **Revue de style :** Scanner les classes Tailwind CSS pour détecter tout `rounded-full` sur les boutons ou tout dégradé pourpre/violet non justifié.
2. **Revue du balisage :** Vérifier qu'aucun emoji brut n'est injecté comme icône.
3. **Revue du copywriting :** Contrôler l'absence de slogans vagues et d'em-dashes systématiques.
4. **Audit de mise en ligne :** Valider la présence des pages légales (`/privacy`, `/terms`), du favicon et l'absence de mentions tierces IA.
