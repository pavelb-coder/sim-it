#!/usr/bin/env python3
"""Собирает сайт тренажёров: каждый продукт в один автономный HTML + хаб-страницу.

    python3 build_site.py
"""
import json
import pathlib
import re
import shutil

BASE = pathlib.Path(__file__).resolve().parent
SHARED = BASE / 'shared'
PRODUCTS_DIR = BASE / 'products'

THEME = (SHARED / 'theme.css').read_text(encoding='utf-8')
SHELL = (SHARED / 'shell.js').read_text(encoding='utf-8')
TEMPLATE = (SHARED / 'page.html').read_text(encoding='utf-8')

PRODUCTS = [
    dict(slug='python', mark='Py', h1='Python-класс',
         title='Python-класс · тренажёр для IT-квантума',
         subtitle='239 задач с автопроверкой · 10 модулей',
         description='Браузерный тренажёр Python для IT-квантума: 239 задач по 26 темам с автопроверкой, без установки и без интернета.',
         tag='язык программирования', color='#7bd88f'),
    dict(slug='cpp', mark='C++', h1='C++-класс',
         title='C++-класс · тренажёр для IT-квантума',
         subtitle='211 задач · свой компилятор C++ прямо в браузере',
         description='Тренажёр C++ для IT-квантума: 211 задач по 20 темам с автопроверкой, учебное подмножество C++ выполняется в браузере без установки.',
         tag='язык программирования', color='#5aa9ff'),
    dict(slug='terminal', mark='$_', h1='Терминал Linux',
         title='Терминал Linux · тренажёр для IT-квантума',
         subtitle='25 задач · виртуальная файловая система в браузере',
         description='Тренажёр терминала Linux в браузере: виртуальная файловая система, 25 задач с автопроверкой, без установки.',
         tag='операционные системы', color='#7fd1ff'),
    dict(slug='network', mark='⇄', h1='Симулятор сети',
         title='Симулятор сети · тренажёр для IT-квантума',
         subtitle='22 задачи · IP, маски, маршрутизация и ping по шагам',
         description='Симулятор сети в браузере: 22 задачи на топологии, IP-адресацию, маски, статическую маршрутизацию и ping по шагам.',
         tag='сети', color='#ffcc55'),
    dict(slug='web', mark='</>', h1='Веб-студия',
         title='Веб-студия · тренажёр для IT-квантума',
         subtitle='22 задачи · HTML и CSS с живым превью',
         description='Веб-студия в браузере: 22 задачи по HTML и CSS, живое превью и проверка по критериям.',
         tag='веб-разработка', color='#a78bfa'),
    dict(slug='sql', mark='DB', h1='SQL-тренажёр',
         title='SQL-тренажёр · тренажёр для IT-квантума',
         subtitle='28 задач · запросы к настоящей базе',
         description='SQL-тренажёр в браузере: 28 задач на SELECT, WHERE, LIKE, ORDER BY, LIMIT и агрегаты, проверка по результату запроса.',
         tag='базы данных', color='#37d67a'),
    dict(slug='security', mark='🔐', h1='Кибербезопасность',
         title='Кибербезопасность · тренажёр для IT-квантума',
         subtitle='21 задача · кодировки, хеши, заголовки, code review',
         description='Безопасность для школьников: 21 задача на base64, шифр Цезаря, хеши, разбор HTTP-заголовков и code review.',
         tag='безопасность', color='#ff6b6b'),
    dict(slug='ai', mark='AI', h1='Нейросеть изнутри',
         title='Нейросеть изнутри · тренажёр для IT-квантума',
         subtitle='15 задач · перцептрон обучается в браузере',
         description='Нейросеть изнутри: 15 задач на перцептрон, обучение на глазах, веса, потери, AND/OR/XOR и реальные данные.',
         tag='искусственный интеллект', color='#5aa9ff'),
]


def inline(html: str, **parts) -> str:
    for marker, code in parts.items():
        html = html.replace('/*__%s__*/' % marker.upper(), code.replace('</script>', '<\\/script>'))
    return html


def build_python() -> str:
    """Python-класс собирается своим build.py и просто копируется."""
    import subprocess
    subprocess.run(['python3', str(BASE / 'python-class' / 'build.py')], check=True,
                   cwd=str(BASE / 'python-class'), stdout=subprocess.DEVNULL)
    dst = BASE / 'python' / 'index.html'
    dst.parent.mkdir(exist_ok=True)
    shutil.copyfile(BASE / 'python-class' / 'dist' / 'python-class.html', dst)
    return 'python/index.html'


def build_product(cfg: dict) -> str:
    slug = cfg['slug']
    if slug == 'python':
        return build_python()

    pdir = PRODUCTS_DIR / slug
    if not (pdir / 'workspace.html').exists():
        return None  # продукт ещё не готов
    workspace = (pdir / 'workspace.html').read_text(encoding='utf-8')
    tools = (pdir / 'tools.html').read_text(encoding='utf-8') if (pdir / 'tools.html').exists() else ''
    tasks = (pdir / 'tasks.js').read_text(encoding='utf-8')
    if (pdir / 'tasks-bank.js').exists():
        tasks += '\n' + (pdir / 'tasks-bank.js').read_text(encoding='utf-8')
    app = ''
    if (pdir / 'engine.js').exists():
        app += (pdir / 'engine.js').read_text(encoding='utf-8') + '\n'
    app += (pdir / 'app.js').read_text(encoding='utf-8')
    extra_css = (pdir / 'style.css').read_text(encoding='utf-8') if (pdir / 'style.css').exists() else ''

    page = TEMPLATE
    page = page.replace('{{TITLE}}', cfg['title'])
    page = page.replace('{{DESCRIPTION}}', cfg['description'])
    page = page.replace('{{MARK}}', cfg['mark'])
    page = page.replace('{{H1}}', cfg['h1'])
    page = page.replace('{{SUBTITLE}}', cfg['subtitle'])
    page = page.replace('{{LOGO_COLOR}}', '#e7ecf6')
    page = page.replace('{{TOOLS}}', tools)
    page = page.replace('{{WORKSPACE}}', workspace)
    page = page.replace('{{FOOT}}',
                        'Работает без интернета и без установки · всё выполняется локально в браузере · '
                        'прогресс хранится на этом устройстве')
    page = inline(page, theme=THEME + '\n' + extra_css, shell=SHELL, tasks=tasks, app=app)

    out = BASE / slug / 'index.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding='utf-8')
    return f'{slug}/index.html'


def build_hub(products_built: list) -> str:
    cards = []
    for cfg in PRODUCTS:
        page = BASE / cfg['slug'] / 'index.html'
        ready = page.exists()
        size = f"{(page.stat().st_size / 1024):.0f} КБ" if ready else ''
        arrow = ' · открыть →' if ready else ' · скоро'
        card = (
            '<a class="hub-card' + ('' if ready else ' soon') + '" href="' + cfg['slug'] + '/">'
            '<div class="chips"><span class="chip module">' + cfg['tag'] + '</span></div>'
            '<h3>' + cfg['mark'].replace('&', '&amp;') + ' ' + cfg['h1'] + '</h3>'
            '<p>' + cfg['subtitle'] + '</p>'
            '<span class="tag">' + size + arrow + '</span>'
            '</a>'
        )
        cards.append(card)
    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IT-квантум · тренажёры в браузере</title>
<meta name="description" content="Браузерные тренажёры для IT-квантума: Python, C++, терминал Linux, сети, веб, SQL, безопасность, нейросети. Без установки и без интернета.">
<style>{THEME}</style>
</head>
<body>
<header class="topbar">
  <div class="logo"><span class="logo-mark">IT</span>
    <span>IT-квантум<small>тренажёры в браузере · без установки</small></span></div>
  <div class="spacer"></div>
  <span class="badge">продуктов: {len(PRODUCTS)}</span>
</header>
<div style="max-width:1200px;margin:0 auto;padding:22px 16px 40px">
  <h1 style="font-size:26px;margin:6px 0 6px;letter-spacing:-.02em">Лаборатория IT-квантума</h1>
  <p style="color:var(--muted);max-width:760px;margin:0 0 20px">
    Восемь тренажёров по направлениям IT-квантума. Каждый работает целиком в браузере:
    ничего не нужно устанавливать, не нужен интернет и аккаунт, код и действия выполняются
    локально. Есть задачи с автопроверкой — как в хороших симуляторах, только для IT.
  </p>
  <div class="hub-grid">
    {''.join(cards)}
  </div>
  <h2 style="font-size:17px;margin:34px 0 8px">Как пользоваться</h2>
  <p style="color:var(--muted);max-width:760px;margin:0">
    Откройте тренажёр, решайте задачи по порядку — следующая открывается после сдачи предыдущей.
    Кнопка «Открыть все задачи» снимает ограничение (режим педагога). Прогресс хранится в браузере.
    Работает и с телефона, и с планшета.
  </p>
  <p style="color:#4f5a6e;font-size:12px;margin-top:28px">
    Исходники и инструкции — в <a href="https://github.com/pavelb-coder/sim-it">репозитории</a>.
  </p>
</div>
</body>
</html>"""
    (BASE / 'index.html').write_text(html, encoding='utf-8')
    return 'index.html'


if __name__ == '__main__':
    (BASE / 'python').mkdir(exist_ok=True)
    built = []
    for cfg in PRODUCTS:
        r = build_product(cfg)
        if r:
            built.append(r)
    built.append(build_hub(built))
    print('собрано:')
    for b in built:
        p = BASE / b
        print(f'  {b:28} {(p.stat().st_size / 1024) if p.exists() else 0:6.1f} КБ')
