#!/bin/sh
set -eu

deploy_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
backup_dir="$deploy_dir/backups"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
container=$(docker compose -f "$deploy_dir/compose.yaml" --env-file "$deploy_dir/.env" ps -q api)

if [ -z "$container" ]; then
  echo "API container is not running." >&2
  exit 1
fi

mkdir -p "$backup_dir"
tmp="$backup_dir/lingo-loop-$stamp.json.tmp"
final="$backup_dir/lingo-loop-$stamp.json"
docker cp "$container:/data/lingo-loop.json" "$tmp"
docker run --rm -v "$backup_dir:/backup:ro" node:22-alpine \
  node -e "JSON.parse(require('fs').readFileSync('/backup/$(basename "$tmp")','utf8'))"
mv "$tmp" "$final"
find "$backup_dir" -type f -name 'lingo-loop-*.json' -mtime +30 -delete
echo "$final"
