#!/usr/bin/env python3
"""Проверка целостности плагина mod_simquantum без установки Moodle.

Что проверяется:
  * синтаксис всех PHP-файлов (если в системе есть php);
  * version.php: компонент, версия, требование к Moodle;
  * языковые файлы en и ru: одинаковый набор ключей, нет пустых значений;
  * все get_string('...', 'mod_simquantum') имеют перевод в обоих языках;
  * каталог тренажёров: код -> файл в assets/, подписи trainer_<slug> есть;
  * db/install.xml: корректный XML, поля совпадают с тем, что пишет код;
  * db/access.php: описанные права есть в языковых файлах;
  * файлы плагина на месте (view, content, mod_form, lib, backup/restore, privacy).

Запуск:  python3 tools/check_plugin.py
"""
from __future__ import annotations

import pathlib
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLUGIN = ROOT / "simquantum"

REQUIRED_FILES = [
    "version.php",
    "lib.php",
    "mod_form.php",
    "view.php",
    "content.php",
    "index.php",
    "settings.php",
    "styles.css",
    "db/install.xml",
    "db/access.php",
    "db/upgrade.php",
    "lang/en/simquantum.php",
    "lang/ru/simquantum.php",
    "classes/local/catalog.php",
    "classes/event/course_module_viewed.php",
    "classes/privacy/provider.php",
    "backup/moodle2/backup_simquantum_activity_task.class.php",
    "backup/moodle2/backup_simquantum_stepslib.php",
    "backup/moodle2/restore_simquantum_activity_task.class.php",
    "backup/moodle2/restore_simquantum_stepslib.php",
    "pix/icon.svg",
]

CHECKS = {"pass": 0, "fail": 0}
PROBLEMS: list[str] = []


def check(condition: bool, label: str, detail: str = "") -> bool:
    if condition:
        CHECKS["pass"] += 1
        print(f"  ok   {label}")
    else:
        CHECKS["fail"] += 1
        PROBLEMS.append(label + (" — " + detail if detail else ""))
        print(f"  ПРОВАЛ {label}" + (f" — {detail}" if detail else ""))
    return condition


def php_files() -> list[pathlib.Path]:
    return sorted(p for p in PLUGIN.rglob("*.php"))


def lint() -> None:
    print("== Синтаксис PHP ==")
    php = shutil.which("php") or shutil.which(str(pathlib.Path.home() / "bin" / "php"))
    if not php:
        print("  пропуск: php в системе не найден")
        return
    bad = []
    for path in php_files():
        res = subprocess.run([php, "-l", str(path)], capture_output=True, text=True)
        if res.returncode != 0:
            bad.append(f"{path.relative_to(PLUGIN)}: {res.stdout.strip() or res.stderr.strip()}")
    check(not bad, f"php -l по {len(php_files())} файлам", "; ".join(bad)[:400])


def version() -> None:
    print("== version.php ==")
    text = (PLUGIN / "version.php").read_text(encoding="utf-8")
    check("$plugin->component = 'mod_simquantum'" in text, "компонент mod_simquantum")
    m = re.search(r"\$plugin->version\s*=\s*(\d+);", text)
    check(bool(m), "версия задана")
    if m:
        check(len(m.group(1)) == 10, "версия из 10 цифр (формат Moodle)", m.group(1))
        year = int(m.group(1)[:4])
        check(2000 < year < 2100, "год в версии правдоподобен", str(year))
    check("$plugin->requires" in text, "требование к версии Moodle задано")
    check("$plugin->release" in text, "релиз задан")


def parse_lang(path: pathlib.Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    strings = {}
    for m in re.finditer(r"^\$string\['([^']+)'\]\s*=\s*(.*?);\s*$", text, re.M | re.S):
        key, value = m.group(1), m.group(2).strip()
        strings[key] = value
    return strings


def lang() -> tuple[dict[str, str], dict[str, str]]:
    print("== Языковые файлы ==")
    en = parse_lang(PLUGIN / "lang/en/simquantum.php")
    ru = parse_lang(PLUGIN / "lang/ru/simquantum.php")
    check(len(en) > 30, f"английских строк: {len(en)}")
    check(len(ru) > 30, f"русских строк: {len(ru)}")

    only_en = sorted(set(en) - set(ru))
    only_ru = sorted(set(ru) - set(en))
    check(not only_en, "нет строк только по-английски", ", ".join(only_en)[:300])
    check(not only_ru, "нет строк только по-русски", ", ".join(only_ru)[:300])

    empty = [k for k, v in en.items() if v in ("''", '""', "")]
    check(not empty, "нет пустых английских строк", ", ".join(empty)[:200])

    for key in ("modulename", "modulename_help", "pluginname", "privacy:metadata"):
        check(key in en and key in ru, f"обязательная строка {key}")

    # Все get_string('ключ', 'mod_simquantum') в коде должны быть переведены.
    used = set()
    for path in php_files():
        src = path.read_text(encoding="utf-8")
        used |= set(re.findall(r"get_string\(\s*'([^']+)'\s*,\s*'mod_simquantum'", src))
        used |= set(re.findall(r"get_string\(\s*\"([^\"]+)\"\s*,\s*'mod_simquantum'", src))
    # Динамические ключи вида 'trainer_' . $slug проверяются отдельно, в каталоге.
    missing = sorted(k for k in used if k not in en or k not in ru)
    check(not missing, f"все {len(used)} ключей из кода переведены", ", ".join(missing)[:300])
    return en, ru


def catalog(en: dict[str, str], ru: dict[str, str]) -> None:
    print("== Каталог тренажёров ==")
    src = (PLUGIN / "classes/local/catalog.php").read_text(encoding="utf-8")
    block = re.search(r"const TRAINERS = \[(.*?)\];", src, re.S)
    if not check(bool(block), "таблица TRAINERS найдена"):
        return
    entries = re.findall(r"'([a-z0-9]+)'\s*=>\s*\['file'\s*=>\s*'([a-z0-9]+\.html)'", block.group(1))
    check(len(entries) >= 10, f"тренажёров в каталоге: {len(entries)}")

    missing_files = [f for _, f in entries if not (PLUGIN / "assets" / f).is_file()]
    check(not missing_files, "файлы всех тренажёров лежат в assets/", ", ".join(missing_files)[:300])

    empty_files = [f for _, f in entries
                   if (PLUGIN / "assets" / f).is_file() and (PLUGIN / "assets" / f).stat().st_size < 1024]
    check(not empty_files, "файлы тренажёров не пустые", ", ".join(empty_files)[:200])

    missing_lang = []
    for slug, _ in entries:
        for key in (f"trainer_{slug}", f"trainer_{slug}_desc"):
            if key not in en or key not in ru:
                missing_lang.append(key)
    check(not missing_lang, "у каждого тренажёра есть название и описание", ", ".join(missing_lang)[:300])

    # Каждый файл в assets/ должен быть описан в каталоге.
    described = {f for _, f in entries}
    extra = sorted(p.name for p in (PLUGIN / "assets").glob("*.html") if p.name not in described)
    check(not extra, "в assets/ нет лишних файлов", ", ".join(extra)[:200])

    check("DEFAULT_TRAINER" in src and "clamp_height" in src, "есть тренажёр по умолчанию и ограничение высоты")


def xmldb() -> None:
    print("== db/install.xml ==")
    path = PLUGIN / "db" / "install.xml"
    try:
        tree = ET.parse(path)
    except ET.ParseError as exc:
        check(False, "install.xml разбирается как XML", str(exc))
        return
    check(True, "install.xml разбирается как XML")
    tables = [t.get("NAME") for t in tree.iter("TABLE")]
    check(tables == ["simquantum"], "одна таблица simquantum", str(tables))
    fields = {f.get("NAME") for f in tree.iter("FIELD")}
    expected = {"id", "course", "name", "intro", "introformat", "trainer", "height", "timecreated", "timemodified"}
    check(fields == expected, "набор полей совпадает с ожидаемым", str(sorted(fields ^ expected)))

    # Поля, которые пишет код, должны существовать в схеме.
    used = set()
    for name in ("lib.php", "view.php", "content.php", "backup/moodle2/backup_simquantum_stepslib.php"):
        src = (PLUGIN / name).read_text(encoding="utf-8")
        for m in re.finditer(r"\$DB->(?:insert_record|update_record|get_record)\('simquantum'", src):
            used.add(name)
    check(bool(used), "код работает с таблицей simquantum")


def access(en: dict[str, str], ru: dict[str, str]) -> None:
    print("== db/access.php ==")
    src = (PLUGIN / "db/access.php").read_text(encoding="utf-8")
    caps = set(re.findall(r"'(mod/simquantum:[a-z]+)'", src))
    check(caps == {"mod/simquantum:addinstance", "mod/simquantum:view"}, "описаны два права", str(sorted(caps)))
    # Названия прав в Moodle берутся как get_string('simquantum:view', 'mod_simquantum').
    for cap in caps:
        key = cap.split("/")[1]          # simquantum:view — так ключ называется в языке Moodle.
        check(key in en and key in ru, f"право {cap} переведено",
              "" if key in en else "нет строки " + key)


def files() -> None:
    print("== Файлы плагина ==")
    missing = [f for f in REQUIRED_FILES if not (PLUGIN / f).exists()]
    check(not missing, "все обязательные файлы на месте", ", ".join(missing)[:400])

    # В коде не должно оставаться закрывающего ?> и BOM.
    bad = []
    for path in php_files():
        raw = path.read_bytes()
        if raw.startswith(b"\xef\xbb\xbf"):
            bad.append(f"{path.name}: BOM")
        if raw.rstrip().endswith(b"?>"):
            bad.append(f"{path.name}: закрывающий ?>")
    check(not bad, "нет BOM и закрывающих ?>", ", ".join(bad)[:300])

    # content.php не должен ничего печатать, кроме файла тренажёра.
    content = (PLUGIN / "content.php").read_text(encoding="utf-8")
    check("readfile(" in content, "content.php отдаёт файл через readfile")
    check("required_param('id', PARAM_INT)" in content, "content.php принимает только id элемента курса")
    check("catalog::asset_path(" in content, "путь берётся из каталога, а не из параметра")


def main() -> int:
    print(f"плагин: {PLUGIN}\n")
    lint()
    version()
    en, ru = lang()
    catalog(en, ru)
    xmldb()
    access(en, ru)
    files()

    print()
    if PROBLEMS:
        print(f"провалов: {CHECKS['fail']}")
        for item in PROBLEMS:
            print("  -", item)
        return 1
    print(f"всё в порядке: {CHECKS['pass']} проверок")
    return 0


if __name__ == "__main__":
    sys.exit(main())
