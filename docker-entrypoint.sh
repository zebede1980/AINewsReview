#!/bin/sh
set -e

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed if database is new (no topics yet)
TOPIC_COUNT=$(sqlite3 "$DATABASE_URL" "SELECT COUNT(*) FROM Topic;" 2>/dev/null || echo "0")
if [ "$TOPIC_COUNT" = "0" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts
fi

echo "Starting server..."
exec node server.js
