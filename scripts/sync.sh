#!/usr/bin/env bash
# Синхронизация проекта с репозиторием pavelb-coder/sim-it.
# Авторизация: git credential store (~/.git-credentials) или GITHUB_TOKEN в окружении.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${GITHUB_TOKEN:-}" ]; then
  git config credential.helper "!f() { echo \"username=pavelb-coder\"; echo \"password=\${GITHUB_TOKEN}\"; }; f"
fi

MSG="${1:-sync: обновление проекта}"

# пересобрать тренажёр Python (он собирается своим build.py)
if [ -f python-class/build.py ]; then
  python3 python-class/build.py >/dev/null
fi

# пересобрать остальные продукты и каталог
if [ -f build_site.py ]; then
  python3 build_site.py
fi

git add -A
if git diff --cached --quiet; then
  echo "изменений нет — синхронизировать нечего"
else
  git commit -m "$MSG"
fi
GIT_TERMINAL_PROMPT=0 git push origin main
echo "синхронизировано: $(git log --oneline -1)"

# После обновления main обновляем и ветку плагина Moodle:
# пересобрать тренажёры внутри плагина, поднять версию, пересобрать ZIP, запушить.
if [ -x scripts/sync_plugin.sh ]; then
  echo
  echo "— ветка moodle-plugin —"
  PLUGIN_SYNC_FLAGS="${PLUGIN_SYNC_FLAGS:---check}"
  bash scripts/sync_plugin.sh $PLUGIN_SYNC_FLAGS \
    || echo "внимание: ветку moodle-plugin обновить не удалось (main уже опубликован)"
fi
