#!/usr/bin/env bash
# Apply all admin SQL migrations in order
set -euo pipefail

DB_URL="${DATABASE_URL:?Set DATABASE_URL}"

for f in "$(dirname "$0")"/0*.sql; do
  echo "==> $f"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Admin schema applied."
