#!/bin/sh
set -eu

deploy_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
backup_dir="$deploy_dir/data/backups"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
final="$backup_dir/lingo-loop-$stamp.sqlite"

mkdir -p "$backup_dir"
docker compose -f "$deploy_dir/compose.yaml" --env-file "$deploy_dir/.env" exec -T api node dist/backup.js "/data/backups/$(basename "$final")"
find "$backup_dir" -type f -name 'lingo-loop-*.sqlite' -mtime +30 -delete
echo "$final"
