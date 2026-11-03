#!/bin/sh
# Renders /usr/share/nginx/html/config.json from whitelisted FEATURE_* variables
# at container start. Anything that is not a recognised boolean is omitted, so
# the frontend falls back to its default (off).
set -eu

CONFIG_FILE=/usr/share/nginx/html/config.json
KEYS="FEATURE_CHARACTER_MODAL_V2 FEATURE_MY_MULTIVERSE FEATURE_GLOBE_3D"

first=1
printf '{' > "$CONFIG_FILE"

for key in $KEYS; do
  value=$(printenv "$key" 2>/dev/null || true)
  normalized=$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')

  case "$normalized" in
    true|1|on|enabled) rendered=true ;;
    false|0|off|disabled) rendered=false ;;
    *) continue ;;
  esac

  if [ "$first" -eq 0 ]; then
    printf ',' >> "$CONFIG_FILE"
  fi

  printf '"%s":"%s"' "$key" "$rendered" >> "$CONFIG_FILE"
  first=0
done

printf '}\n' >> "$CONFIG_FILE"
