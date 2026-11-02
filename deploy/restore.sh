#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /path/to/lingo-loop-backup.sqlite" >&2
  exit 2
fi

deploy_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_file=$(CDPATH= cd -- "$(dirname -- "$1")" && pwd)/$(basename -- "$1")
if [ ! -f "$source_file" ]; then
  echo "Backup not found: $source_file" >&2
  exit 1
fi

docker run --rm -v "$(dirname "$source_file"):/backup:ro" node:24-alpine \
  node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/backup/$(basename "$source_file")',{readOnly:true});const row=db.prepare('PRAGMA integrity_check').get();if(row.integrity_check!=='ok'||!db.prepare('SELECT payload FROM app_state WHERE id=1').get())process.exit(1);db.close()"

"$deploy_dir/backup.sh"
docker compose -f "$deploy_dir/compose.yaml" --env-file "$deploy_dir/.env" stop api
mkdir -p "$deploy_dir/data"
cp "$source_file" "$deploy_dir/data/lingo-loop.sqlite.restore"
mv "$deploy_dir/data/lingo-loop.sqlite.restore" "$deploy_dir/data/lingo-loop.sqlite"
rm -f "$deploy_dir/data/lingo-loop.sqlite-wal" "$deploy_dir/data/lingo-loop.sqlite-shm"
docker compose -f "$deploy_dir/compose.yaml" --env-file "$deploy_dir/.env" up -d api
docker compose -f "$deploy_dir/compose.yaml" --env-file "$deploy_dir/.env" ps
