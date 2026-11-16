#!/usr/bin/env python3
"""Поднять версию плагина Moodle в version.php.

Формат версии Moodle: YYYYMMDDXX. Правило простое:
    новая версия = max(текущая + 1, сегодняшняя дата + "00")

Так обновление, вышедшее в тот же день, получает XX = 01, 02, …, а первое
обновление нового дня — YYYYMMDD00. Поле release (1.0.0) инкрементится по
последней цифре: 1.0.0 → 1.0.1.

    python3 scripts/plugin_bump.py simquantum/version.php          # поправить файл
    python3 scripts/plugin_bump.py simquantum/version.php --dry-run  # только показать
"""
from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import sys


def bump(text: str, today: datetime.date) -> tuple[str, dict]:
    match = re.search(r"\$plugin->version\s*=\s*(\d+);", text)
    if not match:
        raise SystemExit("в файле нет $plugin->version")
    current = int(match.group(1))

    floor = int(today.strftime("%Y%m%d") + "00")
    new = max(current + 1, floor)

    release_match = re.search(r"\$plugin->release\s*=\s*'([^']+)';", text)
    old_release = release_match.group(1) if release_match else "1.0.0"
    parts = old_release.split(".")
    if len(parts) == 3 and all(p.isdigit() for p in parts):
        parts[2] = str(int(parts[2]) + 1)
    new_release = ".".join(parts)

    text = text.replace(match.group(0), f"$plugin->version   = {new};")
    if release_match:
        text = text.replace(release_match.group(0), f"$plugin->release   = '{new_release}';")

    return text, {
        "old_version": current,
        "new_version": new,
        "old_release": old_release,
        "new_release": new_release,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Поднять версию плагина mod_simquantum")
    parser.add_argument("versionfile", help="путь к simquantum/version.php")
    parser.add_argument("--dry-run", action="store_true", help="не менять файл, только показать")
    args = parser.parse_args()

    path = pathlib.Path(args.versionfile)
    if not path.is_file():
        print(f"нет файла {path}", file=sys.stderr)
        return 1

    text = path.read_text(encoding="utf-8")
    updated, info = bump(text, datetime.date.today())

    if not args.dry_run:
        path.write_text(updated, encoding="utf-8")

    print(json.dumps(info, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
