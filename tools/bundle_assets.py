#!/usr/bin/env python3
"""Разложить собранные тренажёры по папке assets/ плагина.

Тренажёры — автономные HTML-файлы, которые собирает `build_site.py` в основном
репозитории (ветка main). Этот скрипт берёт готовые файлы и копирует их в
`simquantum/assets/` под именами, которые ждёт класс catalog из плагина.

Использование:
    python3 tools/bundle_assets.py                 # источник по умолчанию: ../sim-it
    python3 tools/bundle_assets.py /путь/к/sim-it  # явный путь к репозиторию тренажёров
"""
import hashlib
import pathlib
import shutil
import sys

PLUGIN = pathlib.Path(__file__).resolve().parent.parent / "simquantum"
ASSETS = PLUGIN / "assets"

# Код тренажёра в каталоге плагина -> папка собранного продукта.
TRAINERS = {
    "python": "python",
    "cpp": "cpp",
    "terminal": "terminal",
    "network": "network",
    "web": "web",
    "sql": "sql",
    "security": "security",
    "ai": "ai",
    "pyplay": "pyplay",
    "cppplay": "cppplay",
}


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def main() -> int:
    source = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else PLUGIN.parent.parent / "sim-it"
    if not source.is_dir():
        print(f"нет папки с тренажёрами: {source}")
        return 1

    ASSETS.mkdir(parents=True, exist_ok=True)
    rows = []
    missing = []
    for slug, folder in TRAINERS.items():
        src = source / folder / "index.html"
        if not src.exists():
            missing.append(f"{folder}/index.html")
            continue
        dst = ASSETS / f"{slug}.html"
        shutil.copyfile(src, dst)
        rows.append((slug, dst.name, dst.stat().st_size, sha256(dst)))

    total = sum(r[2] for r in rows)
    print(f"источник: {source}")
    for slug, name, size, digest in rows:
        print(f"  {name:<16} {size / 1024:7.1f} КБ   sha256:{digest}")
    print(f"итого: {len(rows)} файлов, {total / 1024 / 1024:.2f} МБ")

    if missing:
        print("\nне найдено (сначала соберите: python3 build_site.py):")
        for item in missing:
            print("  -", item)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
