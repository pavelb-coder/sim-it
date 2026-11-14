#!/usr/bin/env bash
# Полный прогон проверок тренажёра: движок, задачи, интерфейс.
set -u
cd "$(dirname "$0")"
fail=0
run() {
  echo "── $1"
  shift
  if "$@"; then echo "   ✔ ok"; else echo "   ✘ ПРОВАЛ"; fail=1; fi
  echo
}
run "смоук-тест движка"        node tests/test_smoke.js
run "движок против CPython"    node tests/test_vs_python.js
run "задачи и эталонные решения" node tests/test_tasks.js
if [ -d node_modules/jsdom ] || node -e "require.resolve('jsdom')" 2>/dev/null; then
  run "интерфейс (jsdom)"      node tests/test_ui.js
  run "работа без localStorage" node tests/test_sandbox.js
else
  echo "── интерфейс: jsdom не установлен, пропуск (npm i jsdom для проверки UI)"
fi
if command -v python3 >/dev/null; then
  run "тесты задач настоящим Python" python3 tests/check_cpython.py
fi
echo "──────────────────────────────"
[ $fail -eq 0 ] && echo "ВСЁ ЗЕЛЁНОЕ" || echo "ЕСТЬ ПРОВАЛЫ"
exit $fail
