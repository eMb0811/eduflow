#!/bin/sh
set -e

echo "=================================================="
echo "🎓 EduFlow - Démarrage du conteneur d'application"
echo "=================================================="

# Correction automatique de l'hôte réseau si DATABASE_URL pointe vers 127.0.0.1 ou localhost
if echo "$DATABASE_URL" | grep -Eq "127\.0\.0\.1:3306|localhost:3306"; then
  if getent hosts mysql > /dev/null 2>&1; then
    echo "ℹ️ Réseau Docker détecté : redirection automatique de 127.0.0.1/localhost vers l'hôte 'mysql'..."
    DATABASE_URL=$(echo "$DATABASE_URL" | sed -E 's/@(127\.0\.0\.1|localhost):3306/@mysql:3306/')
    export DATABASE_URL
  fi
fi

# Attente active de la base de données (résilience réseau)
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Connexion à la base de données : $(echo "$DATABASE_URL" | sed -E 's/:[^:@]+@/:****@/')"
  MAX_RETRIES=30
  COUNT=0
  until npx prisma db push --skip-generate; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
      echo "❌ Erreur : Impossible de joindre la base de données après $MAX_RETRIES tentatives."
      exit 1
    fi
    echo "⏳ Base de données non prête (tentative $COUNT/$MAX_RETRIES), attente de 2s..."
    sleep 2
  done
  echo "✅ Base de données connectée et schéma Prisma synchronisé."
fi

# Initialisation optionnelle de la base de données avec des comptes de démonstration
if [ "$PRISMA_SEED" = "true" ]; then
  echo "🌱 Exécution du seed initial (comptes étudiant et super-admin)..."
  npx tsx prisma/seed.ts || echo "⚠️ Seed terminé ou données déjà existantes."
fi

echo "🚀 Lancement du serveur Next.js sur le port $PORT..."
exec "$@"
