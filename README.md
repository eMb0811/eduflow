# 🎓 EduFlow — Plateforme d'Assistance Éducative Intelligente

> **Événement :** Hackathon Open Source × AI 2026 (Galsen DEV / Hacktoberfest Dakar)  
> **Mode de Conception :** Orchestration par 3 Agents IA Collaboratifs  
> **Licence :** Open Source (MIT)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![MariaDB / TiDB](https://img.shields.io/badge/Database-MariaDB_%2F_TiDB-003545?logo=mariadb)](https://mariadb.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_%26_2.0_Flash-orange?logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎥 Vidéo de Démonstration (Screencast)

[![Visionner la Démo Vidéo sur GitHub](https://img.shields.io/badge/▶️_Regarder_la_Vidéo_de_Démo_sur_GitHub-demo--eduflow.mp4-emerald?style=for-the-badge&logo=github)](https://github.com/eMb0811/eduflow/blob/main/public/demo-eduflow.mp4)

> 📹 **Lien direct GitHub :** [https://github.com/eMb0811/eduflow/blob/main/public/demo-eduflow.mp4](https://github.com/eMb0811/eduflow/blob/main/public/demo-eduflow.mp4)  
> *Démonstration complète de la plateforme : Tableau de bord étudiant, import d'emploi du temps par vision IA, planning de révision automatique, flashcards 3D, QCM interactif, tuteur pédagogique Kocc Barma et console Super Administrateur.*

---

## 👥 Équipe Multi-Agents IA

| Agent | Rôle | Périmètre Technologique |
| :--- | :--- | :--- |
| **Agent 1** | **Backend & Data Engineer** | Prisma ORM (MariaDB / MySQL / TiDB), API Routes Next.js, Auth JWT, Gemini API (Vision, OCR, Flash, RAG) |
| **Agent 2** | **Frontend & UI/UX Engineer** | Next.js App Router, Tailwind CSS, Shadcn/UI, React Native / Expo, State Management |
| **Agent 3** | **Auditor, QA & Lead Integrator** | Code Review, Audit Sécurité & RBAC, Tests d'Intégration, Conformité Hackathon |

---

## ✨ Fonctionnalités Clés du MVP

1. **🔐 Authentification & Profil Académique (Module 1) :**
   - Inscription et connexion sécurisées via JWT et hachage bcrypt.
   - Initialisation automatique du profil étudiant avec préférences académiques.
   - Paramétrage du niveau d'études, domaine et objectifs académiques.

2. **📸 OCR & Extraction d'Emploi du Temps par IA (Module 2) :**
   - Glisser-déposer de photos ou PDF d'emplois du temps.
   - Extraction structurée (jours, heures, salles, professeurs) avec **Gemini Vision**.
   - Affichage interactif dans un calendrier hebdomadaire réactif.

3. **📅 Générateur de Planning Intelligent de Révision (Module 3) :**
   - Algorithme IA croisant les créneaux libres de l'emploi du temps, les objectifs académiques et le volume de travail cible.
   - Zéro conflit d'horaires et répartition équilibrée avec temps de pause.

4. **💬 Assistant Pédagogique Intelligent & RAG (Module 4) :**
   - Chat interactif en temps réel avec streaming Server-Sent Events (SSE).
   - Contexte enrichi par les documents de cours de l'étudiant.
   - Rendu Markdown avec formules mathématiques KaTeX et coloration syntaxique de code.

5. **📚 Gestionnaire de Cours, Synthèse, Flashcards & Quiz (Modules 5 & 6) :**
   - Stockage et extraction de texte de cours (PDF, texte) avec upload sécurisé.
   - Synthèse automatique avec extraction de concepts clés.
   - Génération de cartes mémoires (flashcards) pour mémorisation active (active recall).
   - QCM interactifs auto-évalués avec explications détaillées.

6. **⏱️ Chronomètre Pomodoro & Statistiques (Module 7) :**
   - Sessions de travail et de pauses courtes/longues.
   - Historique et calcul automatique des minutes étudiées par jour et par semaine.

7. **📊 Tableau de Bord Centralisé (Module 8) :**
   - Synthèse de la journée : cours à venir, créneaux de révision, documents récents, séries d'étude (streak).

---

## ⚡ Démarrage Rapide (Quickstart)

### 🐳 Méthode 1 : Démarrage Clé en Main avec Docker (Méthode Recommandée)

Cette méthode lance l'intégralité de la pile (**Application Next.js 14 + Base de données MariaDB 10.11**) en une seule commande, sans nécessiter l'installation locale de Node.js ou d'un serveur MySQL.

#### 1. Prérequis
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/) installés et en cours d'exécution.

#### 2. Cloner le Dépôt
```bash
git clone https://github.com/eMb0811/eduflow.git
cd eduflow
```

#### 3. (Optionnel) Configurer vos Clés d'API
Un fichier `.env` ou `.env.local` peut être utilisé pour surcharger les clés par défaut :
```bash
cp .env.example .env
```
> **Note :** Le fichier `docker-compose.yml` contient déjà des valeurs par défaut opérationnelles pour tester instantanément la plateforme.

#### 4. Lancer les Conteneurs
```bash
docker compose up -d --build
```

#### 🔄 Ce qui s'exécute automatiquement :
1. **Conteneur Base de Données (`eduflow-mysql`) :** Démarre MariaDB 10.11 LTS, configure l'utilisateur `eduflow` et initialise le `healthcheck`.
2. **Conteneur Application (`eduflow-app`) :** Compile l'application Next.js en mode multi-stage sécurisé (utilisateur non-root `nextjs:nodejs` UID 1001).
3. **Point d'Entrée Intelligent (`docker-entrypoint.sh`) :**
   - Attend activement la disponibilité complète de MariaDB (boucle de résilience réseau).
   - Exécute `npx prisma db push` pour synchroniser le schéma relationnel.
   - Exécute `npx tsx prisma/seed.ts` (si `PRISMA_SEED=true`) pour insérer les comptes de démonstration et les jeux d'essai.
   - Démarre le serveur Next.js de production sur le port `3000`.

#### 🌐 Points d'Accès
- **Application Web :** [http://localhost:3000](http://localhost:3000)
- **Base de Données MariaDB :** `localhost:3306` (Base: `eduflow`, User: `eduflow`, Password: `eduflow`)
- **Vérification de Santé (Healthcheck) :** [http://localhost:3000/api/health](http://localhost:3000/api/health)

#### 🔑 Identifiants Préconfigurés (Prêts à Tester)
| Rôle | Adresse E-mail | Mot de Passe | Description |
| :--- | :--- | :--- | :--- |
| **🎓 Étudiant** | `demo@eduflow.app` | `Password123!` | Compte étudiant complet avec cours de démonstration, flashcards 3D, QCM et créneaux de révision |
| **🛡️ Super Admin** | `admin@eduflow.app` | `Password123!` | Accès direct à `/admin` : métriques d'adoption, gestion des comptes, audit logs |

#### 🛠️ Commandes Docker Utiles au Quotidien
```bash
# Consulter les logs en temps réel de l'application
docker compose logs -f app

# Consulter les logs du serveur MariaDB
docker compose logs -f mysql

# Arrêter les conteneurs
docker compose down

# Arrêter et réinitialiser complètement la base de données (supprimer les volumes)
docker compose down -v

# Reconstruire les images Docker à neuf (sans cache)
docker compose build --no-cache
```

---

### 💻 Méthode 2 : Démarrage Local (Mode Développement Node.js)

Si vous préférez exécuter l'application directement avec Node.js sur votre machine :

#### 1. Installer les Dépendances
```bash
npm install
```

#### 2. Configurer les Variables d'Environnement
Copiez le fichier d'exemple :
```bash
cp .env.example .env
```
Renseignez votre chaîne de connexion `DATABASE_URL` (MariaDB/MySQL local ou TiDB Cloud Serverless) et vos clés :
```env
DATABASE_URL="mysql://eduflow:eduflow@localhost:3306/eduflow"
JWT_SECRET="votre-secret-jwt-aleatoire-et-securise"
GEMINI_API_KEY="votre-cle-gemini-api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### 3. Initialiser la Base de Données & Seeder
```bash
# Générer le client Prisma
npm run db:generate

# Synchroniser le schéma Prisma avec votre base
npm run db:push

# Peupler la base avec les données de démonstration
npm run db:seed
```

#### 4. Démarrer le Serveur de Développement
```bash
npm run dev
```
Rendez-vous sur [http://localhost:3000](http://localhost:3000).

---

## 🧪 Tests & Audit Qualité

Pour exécuter la suite de tests et vérifier la conformité du projet :

```bash
# Vérification des types TypeScript stricts
npm run type-check

# Exécution de la suite de tests automatisés Backend & Sécurité
npm run test:backend

# Audit complet (Typecheck + Tests QA)
npm run audit

# Build de production Next.js
npm run build
```

---

## 🔒 Sécurité & Bonnes Pratiques

- **Authentification Sécurisée :** JWT chiffrés (HS256) transmis via cookies sécurisés `HttpOnly` et `SameSite=lax`.
- **Hachage Fort des Mots de Passe :** `bcryptjs` avec salt dédié pour chaque utilisateur.
- **Isolation des Données & Contrôle d'Accès :** Requêtes Prisma scopées systématiquement par `userId` extrait du JWT validé côté serveur. Contrôle RBAC strict pour les routes d'administration.
- **Zéro Clé Exposée :** La clé secrète `GEMINI_API_KEY` et `JWT_SECRET` restent exclusivement confinées côté serveur.
- **Validation Zod Stricte :** Toutes les routes protégées valident rigoureusement les entrées pour éliminer les injections SQL et les payloads malformés.
- **Tolérance aux Pannes IA :** Parsing défensif avec extraction par regex et retries automatiques pour les réponses JSON de Gemini.
- **Conteneurisation Hardened :** Conteneur Docker exécuté sous un utilisateur système non-root (`nextjs:nodejs` UID 1001) avec build multi-étape allégé.

---

## 📄 Licence

Ce projet est sous licence **MIT** — voir le fichier [LICENSE](./LICENSE) pour plus de détails.
Projet développé pour le **Hackathon Open Source × AI 2026**.
