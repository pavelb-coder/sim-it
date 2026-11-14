#!/usr/bin/env python3
"""Собирает один автономный HTML-файл из src/*."""
import pathlib

BASE = pathlib.Path(__file__).resolve().parent   # python-class/
src = BASE / 'src'
html = (src / 'index.html').read_text(encoding='utf-8')
parts = {
    '/*__CSS__*/': (src / 'style.css').read_text(encoding='utf-8'),
    '/*__PY__*/': (src / 'py.js').read_text(encoding='utf-8'),
    '/*__TASKS__*/': (src / 'tasks.js').read_text(encoding='utf-8'),
    '/*__APP__*/': (src / 'app.js').read_text(encoding='utf-8'),
}
for marker, code in parts.items():
    assert marker in html, marker
    # экранируем закрывающиеся теги script внутри кода
    code = code.replace('</script>', '<\\/script>')
    html = html.replace(marker, code)
out = BASE / 'dist'
out.mkdir(exist_ok=True)
target = out / 'python-class.html'
target.write_text(html, encoding='utf-8')
print('собрано:', target, round(len(html) / 1024, 1), 'КБ')

# копия в корне репозитория — её отдаёт локальный сервер и GitHub Pages
root_copy = BASE.parent / 'index.html'
root_copy.write_text(html, encoding='utf-8')
print('опубликовано:', root_copy.name, '(GitHub Pages + локальный сервер)')
