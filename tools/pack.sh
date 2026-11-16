#!/usr/bin/env bash
# Собрать dist/mod_simquantum.zip для установки через «Установить плагин из ZIP-файла».
set -euo pipefail
cd "$(dirname "$0")/.."

PLUGIN="simquantum"
OUT="dist/mod_simquantum.zip"

if [ ! -f "$PLUGIN/version.php" ]; then
  echo "нет $PLUGIN/version.php — запускайте из корня ветки плагина" >&2
  exit 1
fi

mkdir -p dist
rm -f "$OUT"

# В архиве должна быть одна корневая папка simquantum/ — этого ждёт установщик Moodle.
zip -rq "$OUT" "$PLUGIN" \
  -x "$PLUGIN/.DS_Store" "*/__pycache__/*" "*.pyc"

VERSION=$(grep -oP "\\\$plugin->version\s*=\s*\K[0-9]+" "$PLUGIN/version.php")
RELEASE=$(grep -oP "\\\$plugin->release\s*=\s*'\K[^']+" "$PLUGIN/version.php")
FILES=$(unzip -l "$OUT" | tail -1 | awk '{print $2}')
SIZE=$(du -h "$OUT" | cut -f1)

echo "собран $OUT"
echo "  версия: $VERSION (release $RELEASE)"
echo "  файлов: $FILES, размер: $SIZE"

# Быстрая самопроверка архива.
for must in "$PLUGIN/version.php" "$PLUGIN/lib.php" "$PLUGIN/lang/ru/simquantum.php" "$PLUGIN/assets/python.html"; do
  unzip -Z1 "$OUT" | grep -qx "$must" || { echo "в архиве нет $must" >&2; exit 1; }
done
echo "  состав проверен: version.php, lib.php, язык, тренажёры на месте"
