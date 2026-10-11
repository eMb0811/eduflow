# 🎬 EduFlow — Scénario de Démonstration (3 Minutes pour le Jury)

> **Projet :** EduFlow — Plateforme d'Assistance Éducative Intelligente  
> **Hackathon :** Open Source × AI 2026  
> **Durée :** 3 minutes chrono  
> **Modèle IA :** Google Gemini 3.8 Flash  
> **Base de données :** Supabase PostgreSQL (RLS & Stockage privé)

---

## ⏱️ Minute 0:00 - 0:30 | Introduction & Tableau de Bord Central

### Ce qu'on dit :
> « Bonjour à tous. Pour les étudiants universitaires, jongler entre un emploi du temps complexe, des cours denses et des examens stressants est un défi quotidien. EduFlow transforme cette charge mentale en un parcours d'apprentissage fluide, structuré et propulsé par l'IA. »

### Ce qu'on montre :
1. Ouvrir le **Tableau de Bord** (`http://localhost:3000`).
2. Mettre en avant le design soigné en mode sombre, la salutation personnalisée de l'étudiant et les indicateurs en temps réel (cours du jour, examens imminents, heures d'étude hebdomadaires).
3. Montrer la carte de **Planning de révision intelligent** généré par IA sans aucun conflit horaire avec les cours.
4. Cliquer sur le bouton **« Régénérer »** pour montrer l'appel en direct à Gemini et le réordonnancement adaptatif des créneaux de révision.

---

## ⏱️ Minute 0:30 - 1:15 | Module OCR Visuel : Import de l'Emploi du Temps

### Ce qu'on dit :
> « La première étape pour un étudiant est d'intégrer son emploi du temps. Finie la saisie manuelle fastidieuse : une simple photo ou un PDF suffit. »

### Ce qu'on montre :
1. Naviguer vers **Emploi du temps** (`/emploi-du-temps`).
2. Cliquer sur **« Importer une photo »**.
3. Sélectionner l'image de démonstration `public/samples/emploi-du-temps-demo.jpg` (ou glisser-déposer).
4. Cliquer sur **« Analyser l'emploi du temps »**.
5. Observer l'animation de traitement : Gemini Vision extrait instantanément les **14 cours**, normalise les horaires en 24h, identifie les salles et les affecte au bon jour de la semaine.
6. Basculer entre les onglets des jours (Lundi à Vendredi) pour montrer le calendrier interactif parfaitement rempli.

---

## ⏱️ Minute 1:15 - 2:05 | Module Cours & Révisions : Synthèse, Flashcards 3D & Quiz

### Ce qu'on dit :
> « Une fois l'agenda en place, passons aux révisions. EduFlow applique les meilleures pratiques de sciences cognitives : synthèse structurée, mémorisation active par répétition espacée, et auto-évaluation formative. »

### Ce qu'on montre :
1. Naviguer vers **Cours & Quiz** (`/cours`).
2. Sélectionner le cours d'exemple *« Algorithmique : Graphes & Plus Courts Chemins »*.
3. **Onglet Synthèse :** Cliquer sur **« Générer synthèse »** -> Afficher la vue d'ensemble, les concepts clés et les points essentiels pour l'examen générés par Gemini.
4. **Onglet Flashcards :** Cliquer sur **« Créer les flashcards »** :
   - Cliquer sur la carte pour faire une démonstration du **retournement 3D** (Framer Motion `rotateY: 180`).
   - Tester les boutons d'auto-évaluation **« Je maîtrise »** (vert) et **« À revoir »** (orange) pour montrer la progression du deck.
5. **Onglet Quiz :** Cliquer sur **« Lancer le quiz »** :
   - Répondre à une question du QCM à 4 options.
   - Montrer le feedback instantané en vert/rouge et l'explication didactique détaillée.
   - Compléter le quiz pour révéler le score final et le trophée d'encouragement.

---

## ⏱️ Minute 2:05 - 2:40 | Assistant Pédagogique Streaming avec KaTeX

### Ce qu'on dit :
> « Quand un concept résiste, l'étudiant pose directement sa question à son tuteur IA personnalisé. »

### Ce qu'on montre :
1. Naviguer vers **Assistant IA** (`/assistant`).
2. Cliquer sur la suggestion rapide : *« Explique-moi le tri rapide (QuickSort) avec sa complexité et un exemple de code. »*.
3. Observer le **streaming temps réel** fluide des tokens.
4. Mettre en valeur le rendu impeccable des formules mathématiques KaTeX ($O(n \log n)$, $T(n) = 2T(n/2) + O(n)$), des tableaux de complexité et du code coloré avec bouton de copie en un clic.

---

## ⏱️ Minute 2:40 - 3:00 | Minuteur Pomodoro & Conclusion

### Ce qu'on dit :
> « Pour concrétiser le travail, EduFlow intègre un minuteur Pomodoro complet dont chaque session est persistée en base Supabase pour alimenter les statistiques du dashboard. EduFlow est une solution 100% fonctionnelle, sécurisée par Row Level Security, et prête pour le campus ! »

### Ce qu'on montre :
1. Aller sur **Pomodoro** (`/pomodoro`), lancer une session (avec le carillon Web Audio API généré sans asset externe).
2. Retourner sur le **Tableau de bord** pour constater la cohérence globale.
3. Conclure avec assurance.

---

## 💡 Conseils pour l'Orateur
- **Fluidité :** Le serveur de dev Next.js et l'API Gemini sont déjà testés et opérationnels.
- **En cas de coupure réseau :** EduFlow dispose de fallbacks locaux gracieux pour garantir que la démo ne plante jamais devant le jury.
