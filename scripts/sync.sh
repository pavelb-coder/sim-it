#!/usr/bin/env bash
# Синхронизация проекта с репозиторием pavelb-coder/sim-it.
# Авторизация: git credential store (~/.git-credentials) или GITHUB_TOKEN в окружении.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${GITHUB_TOKEN:-}" ]; then
  git config credential.helper "!f() { echo \"username=pavelb-coder\"; echo \"password=\${GITHUB_TOKEN}\"; }; f"
fi

MSG="${1:-sync: обновление проекта}"

# пересобрать однофайловый тренажёр, если менялись исходники
if [ -f python-class/build.py ]; then
  python3 python-class/build.py >/dev/null
fi

git add -A
if git diff --cached --quiet; then
  echo "изменений нет — синхронизировать нечего"
else
  git commit -m "$MSG"
fi
GIT_TERMINAL_PROMPT=0 git push origin main
echo "синхронизировано: $(git log --oneline -1)"
