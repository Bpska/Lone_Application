#!/bin/sh
set -eu

echo "Running database migrations..."
node apps/api/dist/migrate.js

if [ "$#" -gt 0 ]; then
  echo "Running one-time command..."
  exec "$@"
fi

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Loading fictional seed records..."
  node apps/api/dist/seed.js
fi

echo "Starting Saathi API..."
exec node apps/api/dist/server.js
