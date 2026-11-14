#!/usr/bin/env bash
# Запуск тренажёра на Ubuntu / Linux / macOS. Порт по умолчанию — 8087.
set -euo pipefail
cd "$(dirname "$0")"

PORT="${1:-8087}"
PY=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1; then PY="$candidate"; break; fi
done

if [ -n "$PY" ]; then
  exec "$PY" tools/serve.py "$PORT"
fi

# Python не найден — пробуем node (npx http-server) или busybox
if command -v npx >/dev/null 2>&1; then
  echo "Python не найден, запускаю через npx http-server на порту $PORT"
  exec npx --yes http-server . -p "$PORT" -c-1 -o
fi
if command -v busybox >/dev/null 2>&1; then
  echo "Запускаю через busybox httpd на порту $PORT"
  exec busybox httpd -f -p "$PORT" -h .
fi

echo "Не найден ни python3, ни npx, ни busybox."
echo "Откройте файл напрямую: python-class/dist/python-class.html"
exit 1
