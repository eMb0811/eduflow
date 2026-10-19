# 🛡️ Skill Transversal : Anti-Vibe Coding & Standards de Lancement

> **Périmètre :** Agents Frontend, Backend, et Auditeur / QA  
> **Application :** Toutes les pages, composants, rédactions et revues de pré-lancement d'EduFlow

---

## 🎯 Directives Fondamentales

Ce document consigne les impératifs de design, de rédaction et de préparation au lancement pour s'assurer qu'EduFlow ne ressemble jamais à un projet "vibe codé" ou générique.

---

## 🎨 1. Design & UI/UX (Zéro Vibe Coding)

- **Jamais de dégradé violet / pourpre :**  
  Bannir les dégradés saturés violets/roses (`from-purple-600 to-indigo-600`, etc.). Utiliser des teintes sobres, neutres et professionnelles (palette ardoise / slate, zinc, avec des contrastes nets et élégants).
- **Jamais de boutons en forme de pilule :**  
  Interdiction formelle de la classe `rounded-full` sur les boutons interactifs. Conserver des arrondis sobres (`rounded-md`, `rounded-lg`).
- **Pas d'émojis en guise d'icônes :**  
  Ne jamais substituer des icônes SVG par des émojis système (🚀, 🔥, 👋, ✨...). Utiliser uniquement les icônes vectorielles Lucide React (`lucide-react`).
- **Pas d'animations de scroll exagérées :**  
  Supprimer les effets de parallaxe excessifs, les glissements différés ou les zooms gadgets. Les transitions doivent être subtiles, rapides (150-200ms) ou instantanées.

---

## ✍️ 2. Rédaction & Copywriting

- **Pas de hero text vague :**  
  Supprimer toute phrase d'accroche creuse ("Révolutionnez votre manière d'apprendre avec la puissance de l'IA"). Proposer des descriptions concrètes, factuelles et centrées sur l'action de l'étudiant.
- **Pas d'em-dashes (tirets cadratins `—`) abusifs :**  
  Éviter la signature stylistique des textes IA génériques. Employer un ton direct, naturel et professionnel.

---

## 🚀 3. Gate de Pré-Lancement Obligatoire

Le produit ne doit pas être mis en production sans avoir validé les critères suivants :

1. **Nom de domaine personnalisé :** Domaine propre connecté (ex. `eduflow.app`), aucun sous-domaine par défaut de plateforme d'hébergement.
2. **Favicon et icônes complètes :** Favicon personnalisé et icônes d'application configurées pour tous les formats d'écrans.
3. **Suppression du tag "Made with AI" :** Aucun filigrane, mention en bas de page ou badge "Made with AI" / "Généré par IA".
4. **Page de Politique de Confidentialité :** Page légale `/privacy` ou `/politique-de-confidentialite` présente et accessible.
5. **Page des CGU :** Page légale `/terms` ou `/cgu` présente et accessible.
