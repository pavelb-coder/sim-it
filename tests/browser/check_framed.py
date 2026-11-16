#!/usr/bin/env python3
"""Браузерная проверка плагина: тренажёр работает внутри рамки (iframe).

Собирает «мини-Moodle» из tests/harness/moodle_stub.php, подкладывает туда плагин,
поднимает встроенный сервер PHP и открывает content.php в Chromium двумя способами:
напрямую и внутри iframe — как это делает view.php на странице элемента курса.

Проверяется:
  * движок тренажёра загрузился (PyTrainer / CppEngine / Py-площадка);
  * задачи на месте (для Python-класса — 239);
  * тренажёр исполняет код внутри рамки (print / input);
  * нет ошибок JavaScript;
  * ответ приходит с X-Frame-Options: SAMEORIGIN, то есть встраивать можно
    только со своего сайта.

Нужны: php в PATH (или ~/bin/php) и playwright с Chromium:
    pip install playwright && playwright install chromium
Запуск:
    python3 tests/browser/check_framed.py
"""
from __future__ import annotations

import json
import os
import pathlib
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
PLUGIN = ROOT / "simquantum"
STUB = ROOT / "tests" / "harness" / "moodle_stub.php"

FRAME_HTML = """<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>рамка</title></head>
<body style="margin:0">
<iframe id="f" src="/mod/simquantum/content.php?id=1&amp;v={stamp}" style="width:1200px;height:800px;border:0"></iframe>
</body></html>
"""


def write_frame(docroot: pathlib.Path, stamp: str) -> None:
    """Страница-обёртка с рамкой; параметр v сбрасывает кеш браузера между сценариями."""
    (docroot / "frame.html").write_text(FRAME_HTML.format(stamp=stamp), encoding="utf-8")


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def php_binary() -> str | None:
    for candidate in (shutil.which("php"), str(pathlib.Path.home() / "bin" / "php")):
        if candidate and pathlib.Path(candidate).exists():
            return candidate
    return None


def build_docroot() -> pathlib.Path:
    docroot = pathlib.Path(tempfile.mkdtemp(prefix="simquantum-web-")) / "moodle"
    (docroot / "mod").mkdir(parents=True)
    shutil.copytree(PLUGIN, docroot / "mod" / "simquantum")
    shutil.copyfile(STUB, docroot / "config.php")
    (docroot / "fixture.json").write_text(json.dumps({"trainer": "python"}), encoding="utf-8")
    write_frame(docroot, "1")
    return docroot


def main() -> int:
    php = php_binary()
    if not php:
        print("пропуск: php не найден")
        return 0
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("пропуск: playwright не установлен (pip install playwright)")
        return 0

    fails = 0

    def check(condition: bool, label: str, detail: str = "") -> None:
        nonlocal fails
        if condition:
            print(f"  ok   {label}")
        else:
            fails += 1
            print(f"  ПРОВАЛ {label}" + (f" — {detail}" if detail else ""))

    docroot = build_docroot()
    port = free_port()
    server = subprocess.Popen(
        [php, "-S", f"127.0.0.1:{port}", "-t", str(docroot)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    base = f"http://127.0.0.1:{port}"

    # Ждём, пока сервер поднимется (не дольше 5 секунд).
    for _ in range(50):
        try:
            with urllib.request.urlopen(f"{base}/mod/simquantum/content.php?id=1", timeout=1) as resp:
                if resp.status == 200:
                    break
        except Exception:
            time.sleep(0.1)
    else:
        server.terminate()
        print("ПРОВАЛ сервер PHP не поднялся")
        return 1

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(args=["--no-sandbox"])
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            errors: list[str] = []
            page.on("pageerror", lambda exc: errors.append(str(exc)))
            page.on("console", lambda msg: errors.append("console: " + msg.text) if msg.type == "error" else None)

            print("== content.php напрямую ==")
            page.goto(f"{base}/mod/simquantum/content.php?id=1", wait_until="load")
            page.wait_for_timeout(600)
            check(page.title().startswith("Python-класс"), "открылась страница Python-класса", page.title())
            check(page.evaluate("typeof window.PyTrainer !== 'undefined'"), "движок PyTrainer загружен")
            check(page.evaluate("document.querySelectorAll('.task-item').length") == 239,
                  "в тренажёре 239 задач",
                  str(page.evaluate("document.querySelectorAll('.task-item').length")))

            print("\n== тот же тренажёр внутри iframe (как в view.php) ==")
            write_frame(docroot, "python")
            page.goto(f"{base}/frame.html", wait_until="load")
            page.wait_for_timeout(1200)
            frame = page.frame_locator("#f")
            check(frame.locator("#taskList, .task-list, body").first.is_visible(), "рамка отрисована")
            inner = [f for f in page.frames if f != page.main_frame]
            check(bool(inner), "внутри рамки есть документ")
            if inner:
                check(inner[0].evaluate("typeof window.PyTrainer !== 'undefined'"), "движок работает внутри рамки")
                check(inner[0].evaluate("document.querySelectorAll('.task-item').length") == 239,
                      "задачи доступны внутри рамки")
                result = inner[0].evaluate("window.PyTrainer.run('print(2 + 2)', {stdin: []})")
                check(result.get("ok") is True and "4" in (result.get("output") or ""),
                      "код исполняется внутри рамки", json.dumps(result, ensure_ascii=False)[:160])

            print("\n== свободная песочница внутри рамки ==")
            (docroot / "fixture.json").write_text(json.dumps({"trainer": "pyplay"}), encoding="utf-8")
            write_frame(docroot, "pyplay")
            page.goto(f"{base}/frame.html", wait_until="load")
            page.wait_for_timeout(1200)
            inner = [f for f in page.frames if f != page.main_frame]
            if inner:
                check(inner[0].evaluate("typeof window.__play === 'object'"), "площадка загрузилась в рамке")
                output = inner[0].evaluate(
                    "() => { window.__play.setCode(\"n = int(input())\\nprint('квадрат:', n*n)\", '7');"
                    " document.getElementById('btnRun').click();"
                    " return document.getElementById('playOut').textContent; }"
                )
                check("квадрат: 49" in (output or ""), "песочница считает с вводом внутри рамки", (output or "")[:80])

            print("\n== заголовки ответа ==")
            with urllib.request.urlopen(f"{base}/mod/simquantum/content.php?id=1") as resp:
                check(resp.headers.get("X-Frame-Options") == "SAMEORIGIN",
                      "X-Frame-Options: SAMEORIGIN", str(resp.headers.get("X-Frame-Options")))
                check((resp.headers.get("Content-Type") or "").startswith("text/html"),
                      "Content-Type: text/html", str(resp.headers.get("Content-Type")))

            check(not errors, "нет ошибок JavaScript", "; ".join(errors[:3]))
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=5)

    print()
    if fails:
        print(f"провалов: {fails}")
        return 1
    print("всё в порядке: тренажёры работают внутри рамки")
    return 0


if __name__ == "__main__":
    sys.exit(main())
