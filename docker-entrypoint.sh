#!/bin/sh
set -e

# Strip file: prefix for sqlite3 CLI
DB_FILE="${DATABASE_URL#file:}"

# Run migrations
echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

# Seed if database is new (no topics yet)
TOPIC_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Topic;" 2>/dev/null || echo "0")
if [ "$TOPIC_COUNT" = "0" ]; then
  echo "Seeding database..."
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts
fi

echo "Starting server..."
exec node server.js
