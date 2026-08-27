#!/bin/sh
set -eu

psql --set=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=shadow_database="${POSTGRES_DB}_shadow" <<'SQL'
CREATE DATABASE :"shadow_database";
SQL
