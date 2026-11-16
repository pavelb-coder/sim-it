#!/usr/bin/env bash
# Обновить ветку moodle-plugin из текущего состояния main.
#
# Скрипт пересобирает тренажёры, перекладывает их в плагин (simquantum/assets),
# поднимает версию плагина, пересобирает dist/mod_simquantum.zip и коммитит
# изменения в ветку moodle-plugin. Если файлы тренажёров не изменились —
# ничего не делает (кроме --force).
#
# Запускается автоматически:
#   * из scripts/sync.sh после пуша main;
#   * в GitHub Actions (.github/workflows/sync-moodle-plugin.yml) на push в main.
#
# Вручную:
#   bash scripts/sync_plugin.sh                     # обновить, если есть изменения
#   bash scripts/sync_plugin.sh --force             # обновить и поднять версию принудительно
#   bash scripts/sync_plugin.sh --dry-run           # показать, что было бы сделано
#   bash scripts/sync_plugin.sh --check             # с проверками плагина перед коммитом
#   bash scripts/sync_plugin.sh --push "сообщение"  # свой текст коммита
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=$PWD

BRANCH="${PLUGIN_BRANCH:-moodle-plugin}"
FORCE=0
DRY=0
CHECK=0
PUSH=1
MSG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=1 ;;
    --dry-run) DRY=1 ;;
    --check) CHECK=1 ;;
    --no-push) PUSH=0 ;;
    --push) shift; MSG="${1:-}" ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    -*) echo "неизвестный флаг: $1" >&2; exit 2 ;;
    *) MSG="$1" ;;
  esac
  shift
done

if [ -n "${GITHUB_TOKEN:-}" ]; then
  git config credential.helper "!f() { echo \"username=pavelb-coder\"; echo \"password=\${GITHUB_TOKEN}\"; }; f"
fi

# 1. Пересобрать тренажёры из исходников (быстро и всегда — дешевле, чем проверять устаревание).
if [ -f build_site.py ]; then
  python3 build_site.py >/dev/null
fi

# 2. Найти или создать рабочее дерево ветки плагина.
#    prune убирает записи о рабочих деревьях, удалённых вручную.
git worktree prune

WT=$(git worktree list --porcelain | awk -v target="refs/heads/$BRANCH" '
  /^worktree /{wt=$2}
  /^branch /{if ($2 == target) print wt; wt=""}')
if [ -n "$WT" ] && [ ! -f "$WT/simquantum/version.php" ]; then
  WT=""     # запись есть, а ветки по этому пути нет — пересоздадим
fi

if [ -z "$WT" ]; then
  git fetch -q origin "$BRANCH" || true
  WT="${PLUGIN_WORKTREE:-$REPO/moodle-plugin}"
  if [ -e "$WT" ]; then
    echo "путь $WT занят, но это не рабочее дерево ветки $BRANCH — укажите другой через PLUGIN_WORKTREE" >&2
    exit 1
  fi
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git worktree add -q "$WT" "$BRANCH"
  else
    git worktree add -q -b "$BRANCH" "$WT" "origin/$BRANCH"
  fi
  echo "создано рабочее дерево ветки: $WT"
fi

if [ ! -f "$WT/simquantum/version.php" ]; then
  echo "в $WT нет simquantum/version.php — это не ветка плагина" >&2
  exit 1
fi

# Подтянуть удалённое состояние ветки, чтобы не потерять чужие коммиты.
if git -C "$WT" fetch -q origin "$BRANCH" 2>/dev/null; then
  if git -C "$WT" rev-parse --verify -q "origin/$BRANCH" >/dev/null; then
    git -C "$WT" merge --ff-only -q "origin/$BRANCH" 2>/dev/null \
      || echo "внимание: локальная $BRANCH разошлась с origin — продолжаю в локальной"
  fi
fi

# 3. Переложить собранные тренажёры в плагин.
ASSETS_LOG=$(mktemp)
if ! python3 "$WT/tools/bundle_assets.py" "$REPO" >"$ASSETS_LOG" 2>&1; then
  cat "$ASSETS_LOG" >&2
  rm -f "$ASSETS_LOG"
  echo "не удалось разложить тренажёры — ветка не тронута" >&2
  exit 1
fi
ASSETS_SUMMARY=$(head -1 "$ASSETS_LOG")
rm -f "$ASSETS_LOG"

CHANGED=$(git -C "$WT" status --porcelain -- simquantum/assets | wc -l | tr -d ' ')

if [ "$CHANGED" = "0" ] && [ "$FORCE" = "0" ]; then
  echo "ветка $BRANCH уже совпадает с main ($ASSETS_SUMMARY) — обновлять нечего"
  exit 0
fi

if [ "$CHANGED" = "0" ]; then
  echo "файлы тренажёров не изменились, но включён --force — поднимаю версию"
else
  echo "изменились файлы тренажёров: $CHANGED"
fi

# 4. Поднять версию плагина (Moodle предлагает обновление только при новой версии).
BUMP=$(python3 "$REPO/scripts/plugin_bump.py" "$WT/simquantum/version.php" $( [ "$DRY" = "1" ] && echo --dry-run ))
NEW_VERSION=$(printf '%s' "$BUMP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["new_version"])')
NEW_RELEASE=$(printf '%s' "$BUMP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["new_release"])')
echo "версия плагина: $NEW_VERSION (release $NEW_RELEASE)"

# 5. Пересобрать ZIP для установки через админку.
if [ "$DRY" = "0" ]; then
  ( cd "$WT" && bash tools/pack.sh >/dev/null )
  echo "пересобран dist/mod_simquantum.zip"
fi

# 6. Проверки плагина (по флагу --check или по умолчанию в CI).
if [ "$CHECK" = "1" ]; then
  echo "проверяю плагин…"
  ( cd "$WT" && python3 tools/check_plugin.py >/dev/null ) || { echo "check_plugin.py нашёл проблемы" >&2; exit 1; }
  if command -v php >/dev/null 2>&1; then
    ( cd "$WT" && php tests/harness/run.php >/dev/null ) || { echo "tests/harness/run.php нашёл проблемы" >&2; exit 1; }
  fi
  echo "проверки пройдены: check_plugin.py и harness"
fi

if [ "$DRY" = "1" ]; then
  echo "--dry-run: коммит и пуш пропущены; изменения в рабочем дереве:"
  git -C "$WT" status --porcelain | sed 's/^/  /'
  exit 0
fi

# 7. Коммит и пуш ветки.
if [ -z "$MSG" ]; then
  MSG="chore(plugin): тренажёры IT-квантума из main@$(git -C "$REPO" rev-parse --short HEAD) (версия $NEW_VERSION)"
fi

git -C "$WT" add -A
if git -C "$WT" diff --cached --quiet; then
  echo "в ветке $BRANCH нечего коммитить"
  exit 0
fi
git -C "$WT" commit -q -m "$MSG"

if [ "$PUSH" = "1" ]; then
  GIT_TERMINAL_PROMPT=0 git -C "$WT" push -q origin "$BRANCH"
  echo "ветка $BRANCH обновлена: $(git -C "$WT" log --oneline -1)"
else
  echo "коммит создан без пуша: $(git -C "$WT" log --oneline -1)"
fi
