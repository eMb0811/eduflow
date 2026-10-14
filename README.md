# 🎓 EduFlow — Plateforme d'Assistance Éducative Intelligente

> **Hackathon Open Source × AI 2026**  
> Propulsé par **Google Gemini 3.8 Flash** et **Supabase PostgreSQL (RLS & Private Storage)**  
> Licence : [MIT](LICENSE)

---

## 🌟 Présentation

**EduFlow** est une plateforme web moderne conçue pour alléger la charge mentale des étudiants universitaires. En combinant la puissance de modèles multimodaux d'IA et les meilleures pratiques des sciences cognitives, EduFlow transforme la gestion académique quotidienne en une expérience fluide, stimulante et organisée :

1. **Extraction d'Emploi du Temps par Vision (OCR) :** Déposez une photo ou un PDF de votre emploi du temps ; Gemini Vision extrait automatiquement les cours, salles et créneaux avec normalisation 24h.
2. **Générateur de Planning Intelligent :** L'IA analyse vos créneaux libres, vos examens imminents et vos objectifs académiques pour concevoir un planning de révision quotidien sans aucun chevauchement horaire.
3. **Hub de Cours & Révisions Actives :**
   - **Synthèse Cognitive :** Résumés structurés avec concepts clés, définitions et points essentiels pour l'examen.
   - **Flashcards 3D Spaced Repetition :** Cartes de mémorisation réversibles avec animation 3D et auto-évaluation (« Je maîtrise » / « À revoir »).
   - **Quiz QCM Formatif :** Évaluations interactives à 4 choix avec distracteurs réalistes, explications détaillées et calcul instantané du score.
4. **Assistant Pédagogique en Streaming KaTeX :** Un tuteur IA interactif capable d'expliquer pas-à-pas les notions les plus complexes, avec rendu dynamique des formules mathématiques ($\LaTeX$ / KaTeX), tableaux et code annoté.
5. **Minuteur Pomodoro Persistant :** Sessions de concentration et pauses rythmées par un carillon Web Audio API, persistées en base Supabase pour alimenter les statistiques du tableau de bord.

---

## 🛠️ Stack Technique

- **Frontend :** Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion, Lucide Icons, Sonner.
- **Rendu Mathématique & Markdown :** `react-markdown`, `remark-math`, `rehype-katex`.
- **Backend & API :** Next.js Route Handlers avec validation stricte [Zod](https://zod.dev).
- **Intelligence Artificielle :** SDK `@google/genai` avec modèle `gemini-3.8-flash` (mode multimodal, structured JSON et streaming).
- **Base de Données & Auth :** Supabase PostgreSQL avec **Row Level Security (RLS)** activé sur toutes les tables et stockage privé par utilisateur.

---

## 🚀 Démarrage Rapide

### 1. Installation en une commande

```bash
git clone https://github.com/eMb0811/eduflow.git
cd eduflow
npm install
```

### 2. Configuration des Variables d'Environnement

Copiez le modèle de configuration :
```bash
cp .env.example .env.local
```

Remplissez votre fichier `.env.local` avec vos identifiants Supabase et votre clé Gemini API :
```env
# Configuration Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-publique
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role

# Google Gemini API
GEMINI_API_KEY=votre-cle-api-gemini
GEMINI_MODEL=gemini-3.8-flash

# Mocks désactivés (données réelles)
NEXT_PUBLIC_USE_MOCKS=false
```

### 3. Lancement du Serveur de Développement

```bash
npm run dev
```

L'application est immédiatement accessible sur [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Schéma de Base de Données (Supabase)

L'ensemble des tables et politiques de sécurité RLS sont définies dans `supabase/migrations/0001_init.sql` :
- `profiles` : Profil académique et objectifs de l'étudiant.
- `subjects` : Matières et codes couleurs associés.
- `exams` : Dates de partiels et examens à venir.
- `schedule_entries` : Cours hebdomadaires extraits de l'emploi du temps.
- `documents` : Supports de cours et notes attachées.
- `pomodoro_sessions` : Historique des sessions de travail et pauses.
- `chat_messages` : Historique conversationnel avec l'Assistant IA.

Buckets privés dans Supabase Storage : `schedules` et `documents`.

---

## 🧪 Qualité & Tests

Le projet respecte une politique stricte de zéro avertissement et zéro erreur :

```bash
# Vérification du typage TypeScript
npm run typecheck

# Analyse statique et respect des règles React 19
npm run lint

# Build de production complet Webpack
npm run build
```

---

## 📚 Documentation du Projet

- **[Scénario de Démonstration (3 min)](docs/DEMO.md)** : Guide chronométré pour la présentation devant le jury du hackathon.
- **[Rapport d'Audit Technique & Sécurité](docs/AUDIT.md)** : Rapport complet sur les politiques RLS, l'étanchéité des secrets et la robustesse des prompts.
- **[Document de Passation Technique (HANDOFF)](docs/HANDOFF.md)** : Journal d'architecture détaillée et historique des sprints 1, 2 et 3.
- **[Spécifications Produit (PRD)](docs/PRD.md)** : Cahier des charges initial et vision produit.

---

## 📄 Licence

Ce projet est distribué sous licence MIT. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.
