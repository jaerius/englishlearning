#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /path/to/lingo-loop-backup.json" >&2
  exit 2
fi

deploy_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_file=$(CDPATH= cd -- "$(dirname -- "$1")" && pwd)/$(basename -- "$1")

if [ ! -f "$source_file" ]; then
  echo "Backup not found: $source_file" >&2
  exit 1
fi

docker run --rm -v "$(dirname "$source_file"):/backup:ro" node:22-alpine \
  node -e "JSON.parse(require('fs').readFileSync('/backup/$(basename "$source_file")','utf8'))"

docker compose -f "$deploy_dir/compose.yaml" --env-file "$deploy_dir/.env" stop api
mkdir -p "$deploy_dir/data" "$deploy_dir/backups"
if [ -f "$deploy_dir/data/lingo-loop.json" ]; then
  cp "$deploy_dir/data/lingo-loop.json" "$deploy_dir/backups/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).json"
fi
cp "$source_file" "$deploy_dir/data/lingo-loop.json.restore"
mv "$deploy_dir/data/lingo-loop.json.restore" "$deploy_dir/data/lingo-loop.json"
docker compose -f "$deploy_dir/compose.yaml" --env-file "$deploy_dir/.env" up -d api
docker compose -f "$deploy_dir/compose.yaml" --env-file "$deploy_dir/.env" ps
