#!/bin/sh
set -e

# Load expected Docker secrets as environment variables.
# Only known secret names are exported to avoid env var collision.
if [ -d "/run/secrets" ]; then
  for secret_name in DATABASE_URL PVWATTS_API_KEY API_KEY ALLOWED_ORIGINS; do
    secret_file="/run/secrets/$secret_name"
    if [ -f "$secret_file" ]; then
      secret_value=$(cat "$secret_file")
      export "$secret_name"="$secret_value"
    fi
  done
fi

# Run database migrations using the local file path.
# It will naturally look for prisma.config.ts in the root.
node node_modules/prisma/build/index.js migrate deploy

exec "$@"
