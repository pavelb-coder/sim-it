#!/usr/bin/env python3
"""Генератор банка задач для Python- и C++-классов.

Что делает:
 1. берёт задачи из scripts/taskbank_py.py и scripts/taskbank_cpp.py;
 2. прогоняет каждое эталонное решение настоящим python3 / g++ на всех входах,
    забирая ожидаемый вывод (задачи не пишут ожидания руками — они вычисляются);
 3. сверяет вывод с движками тренажёров (py.js и engine.js);
 4. пишет готовые файлы задач: python-class/src/modules/m7…m10.js и products/cpp/tasks-bank.js.

    python3 scripts/gen_taskbank.py            # собрать и проверить
    python3 scripts/gen_taskbank.py --check     # только проверить, не писать
"""
import json, pathlib, subprocess, sys, tempfile, shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from taskbank_py import PY_TOPICS, PY_TASKS          # noqa: E402
from taskbank_cpp import CPP_TOPICS, CPP_TASKS        # noqa: E402

NORM_JS = """
function norm(s){return String(s==null?'':s).replace(/\\r\\n?/g,'\\n').split('\\n')
  .map(l=>l.replace(/[ \\t]+$/,'')).join('\\n').replace(/\\n+$/,'').trim();}
"""


def norm_text(s):
    lines = str(s).replace('\r\n', '\n').replace('\r', '\n').split('\n')
    lines = [ln.rstrip(' \t') for ln in lines]
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines).strip()


def run_python(code, stdin_text, td):
    path = pathlib.Path(td) / 'prog.py'
    path.write_text(code, encoding='utf-8')
    r = subprocess.run(['python3', str(path)], input=stdin_text.encode(),
                       capture_output=True)
    return r.stdout.decode('utf-8'), r.stderr.decode('utf-8'), r.returncode


def run_cpp(code, stdin_text, td):
    src = pathlib.Path(td) / 'prog.cpp'
    exe = pathlib.Path(td) / 'prog'
    src.write_text(code, encoding='utf-8')
    cp = subprocess.run(['g++', '-std=c++17', '-O0', '-o', str(exe), str(src)],
                        capture_output=True, text=True)
    if cp.returncode != 0:
        return None, cp.stderr, 1
    r = subprocess.run([str(exe)], input=stdin_text.encode(), capture_output=True)
    return r.stdout.decode('utf-8'), r.stderr.decode('utf-8'), r.returncode


def engine_outputs(kind, items, td):
    """items: список {code, stdin} — прогон через движок тренажёра (node)."""
    payload = pathlib.Path(td) / 'payload.json'
    payload.write_text(json.dumps(items, ensure_ascii=False), encoding='utf-8')
    if kind == 'py':
        js = NORM_JS + """
const fs = require('fs');
const Py = require(%s);
const items = JSON.parse(fs.readFileSync(%s, 'utf8'));
const out = items.map(it => {
  const r = Py.run(it.code, { stdin: it.stdin === '' ? [] : it.stdin.split('\\n') });
  return r.ok ? { ok: true, output: norm(r.output) }
              : { ok: false, error: (r.error && (r.error.msg || r.error.kind)) || 'ошибка' };
});
console.log(JSON.stringify(out));
""" % (json.dumps(str(ROOT / 'python-class/src/py.js')), json.dumps(str(payload)))
    else:
        js = NORM_JS + """
const fs = require('fs');
const engine = require(%s);
const items = JSON.parse(fs.readFileSync(%s, 'utf8'));
const out = items.map(it => {
  const r = engine.run(it.code, it.stdin);
  return r.ok ? { ok: true, output: norm(r.output) } : { ok: false, error: r.error };
});
console.log(JSON.stringify(out));
""" % (json.dumps(str(ROOT / 'products/cpp/engine.js')), json.dumps(str(payload)))
    res = subprocess.run(['node', '-e', js], capture_output=True, text=True)
    if res.returncode != 0:
        print(res.stderr[:2000])
        raise SystemExit('движок не прогнался')
    return json.loads(res.stdout)


def build_python(td):
    problems, tasks_out = [], []
    topics = {t['key']: t for t in PY_TOPICS}
    items = []
    for topic, title, prompt, hint, solution, stdins in PY_TASKS:
        assert topic in topics, f'неизвестная тема {topic}'
        tests = []
        failed = False
        for stdin in stdins:
            out1, err1, rc1 = run_python(solution, stdin, td)
            if rc1 != 0 or err1.strip():
                problems.append(f'[py/{title}] python3 упал: {err1.strip()[:200]}')
                failed = True
                break
            out2, _, _ = run_python(solution, stdin, td)
            if out1 != out2:
                problems.append(f'[py/{title}] недетерминированный вывод')
                failed = True
                break
            if not out1.strip():
                problems.append(f'[py/{title}] пустой вывод на входе {stdin!r}')
                failed = True
            tests.append({'stdin': stdin, 'expected': norm_text(out1)})
            items.append({'code': solution, 'stdin': stdin, 'title': title, 'want': out1})
        if failed:
            problems_carry = True
        tasks_out.append(dict(topic=topic, title=title, prompt=prompt, hint=hint,
                              solution=solution, tests=tests))
    res = engine_outputs('py', [{'code': i['code'], 'stdin': i['stdin']} for i in items], td)
    for it, r in zip(items, res):
        if not r['ok']:
            problems.append(f"[py/{it['title']}] движок: {r['error']}")
        elif r['output'] != norm_text(it['want']):
            problems.append(f"[py/{it['title']}] движок и CPython расходятся: движок={r['output']!r} python={it['want'].strip()!r}")
    return tasks_out, problems


def build_cpp(td):
    problems, tasks_out = [], []
    topics = {t['key']: t for t in CPP_TOPICS}
    items = []
    for topic, title, prompt, hint, solution, stdins in CPP_TASKS:
        assert topic in topics, f'неизвестная тема {topic}'
        tests = []
        for stdin in stdins:
            out1, err1, rc1 = run_cpp(solution, stdin, td)
            if out1 is None or rc1 != 0 or (err1 or '').strip():
                problems.append(f'[cpp/{title}] g++: {str(err1).strip()[:300]}')
                break
            if not out1.strip():
                problems.append(f'[cpp/{title}] пустой вывод на входе {stdin!r}')
            tests.append({'stdin': stdin, 'expected': norm_text(out1)})
            items.append({'code': solution, 'stdin': stdin, 'title': title, 'want': out1})
        tasks_out.append(dict(topic=topic, title=title, prompt=prompt, hint=hint,
                              solution=solution, tests=tests))
    res = engine_outputs('cpp', [{'code': i['code'], 'stdin': i['stdin']} for i in items], td)
    for it, r in zip(items, res):
        if not r['ok']:
            problems.append(f"[cpp/{it['title']}] движок: {r['error']}")
        elif r['output'] != norm_text(it['want']):
            problems.append(f"[cpp/{it['title']}] движок и g++ расходятся: движок={r['output']!r} g++={it['want'].strip()!r}")
    return tasks_out, problems


PY_MODULES = [
    ('m7', 'Банк задач 1: основы, ввод, условия, циклы',
     'арифметика, ввод-вывод, ветвления, for и while'),
    ('m8', 'Банк задач 2: строки и списки',
     'текст, срезы, списки, сортировка, агрегаты'),
    ('m9', 'Банк задач 3: словари, множества, функции, рекурсия',
     'структуры данных, свои функции, рекурсия, числа'),
    ('m10', 'Банк задач 4: данные, алгоритмы, олимпиадные',
     'статистика, перебор, динамика, итоговые задачи'),
]
PY_GROUPS = [
    ('m7', ['out', 'io', 'if', 'for', 'while']),
    ('m8', ['str1', 'str2', 'list1', 'list2', 'matrix']),
    ('m9', ['dict', 'set', 'func', 'recur', 'num']),
    ('m10', ['stats', 'algo', 'dyn', 'mix', 'final']),
]

CPP_STARTER = '#include <iostream>\nusing namespace std;\n\nint main() {\n    // твой код здесь\n\n    return 0;\n}\n'


def js(v):
    return json.dumps(v, ensure_ascii=False)


def write_python(tasks):
    by_topic = {}
    for t in tasks:
        by_topic.setdefault(t['topic'], []).append(t)
    for mid, topic_keys in PY_GROUPS:
        title, subtitle = next((m[1], m[2]) for m in PY_MODULES if m[0] == mid)
        lines = ['/* ==========================================================================',
                 '   %s' % title,
                 '   Сгенерировано scripts/gen_taskbank.py — правь scripts/taskbank_py.py.',
                 '   ========================================================================== */',
                 '(function (global) {',
                 "  'use strict';",
                 '  global.PYMODULES = global.PYMODULES || [];',
                 '  global.PYMODULES.push({',
                 "    id: %s," % js(mid),
                 '    title: %s,' % js(title),
                 '    subtitle: %s,' % js(subtitle),
                 '    tasks: [']
        chunks = []
        for key in topic_keys:
            topic = next(t for t in PY_TOPICS if t['key'] == key)
            for t in by_topic.get(key, []):
                chunks.append('      ' + json.dumps({
                    'id': 'b%s-%s' % (mid, abs(hash(t['title'])) % 100000),
                    'level': topic['level'],
                    'title': t['title'],
                    'subtitle': topic['subtitle'],
                    'theory': topic['theory'],
                    'prompt': t['prompt'],
                    'examples': [{'inp': t['tests'][0]['stdin'], 'out': t['tests'][0]['expected']}],
                    'starter': topic.get('starter', '# твой код здесь\n'),
                    'tests': t['tests'],
                    'hint': t['hint'],
                    'solution': t['solution'],
                }, ensure_ascii=False))
        # стабильные id: b<module>-<номер по порядку>
        fixed = []
        for i, c in enumerate(chunks, 1):
            obj = json.loads(c)
            obj['id'] = 'b%s-%03d' % (mid, i)
            fixed.append('      ' + json.dumps(obj, ensure_ascii=False))
        lines.append(',\n'.join(fixed))
        lines += ['    ]', '  });', "})(typeof window !== 'undefined' ? window : globalThis);", '']
        path = ROOT / 'python-class/src/modules' / (mid + '.js')
        path.write_text('\n'.join(lines), encoding='utf-8')
        print('  записан', path.relative_to(ROOT), '—', len(fixed), 'задач')


def write_cpp(tasks):
    topics = {t['key']: t for t in CPP_TOPICS}
    objs = []
    for i, t in enumerate(tasks, 1):
        topic = topics[t['topic']]
        objs.append('  ' + json.dumps({
            'id': 'c%03d' % i,
            'level': topic['level'],
            'title': t['title'],
            'subtitle': topic['subtitle'],
            'theory': topic['theory'],
            'prompt': t['prompt'],
            'examples': [{'label': 'пример', 'text': (t['tests'][0]['stdin'] or '(без ввода)') +
                          '  →  ' + t['tests'][0]['expected']}],
            'hint': t['hint'],
            'starter': topic.get('starter', CPP_STARTER),
            'solution': t['solution'],
            'tests': t['tests'],
        }, ensure_ascii=False))
    text = ('/* ==========================================================================\n'
            '   Банк задач C++ — 200 заданий по 20 темам.\n'
            '   Сгенерировано scripts/gen_taskbank.py — правь scripts/taskbank_cpp.py.\n'
            '   ========================================================================== */\n'
            '(function (global) {\n'
            "  'use strict';\n"
            '  var bank = [\n' + ',\n'.join(objs) + '\n  ];\n'
            '  global.CPP_BANK = bank;\n'
            '  global.CPP_TASKS = (global.CPP_TASKS || []).concat(bank);\n'
            "})(typeof window !== 'undefined' ? window : globalThis);\n")
    path = ROOT / 'products/cpp/tasks-bank.js'
    path.write_text(text, encoding='utf-8')
    print('  записан', path.relative_to(ROOT), '—', len(objs), 'задач')


def main():
    check_only = '--check' in sys.argv
    print(f'Python: тем {len(PY_TOPICS)}, задач {len(PY_TASKS)}')
    print(f'C++:    тем {len(CPP_TOPICS)}, задач {len(CPP_TASKS)}')
    with tempfile.TemporaryDirectory() as td:
        py_tasks, py_problems = build_python(td)
        cpp_tasks, cpp_problems = build_cpp(td)
    total_tests = sum(len(t['tests']) for t in py_tasks) + sum(len(t['tests']) for t in cpp_tasks)
    print(f'проверок: {total_tests}')
    problems = py_problems + cpp_problems
    if problems:
        print('\nПРОБЛЕМЫ:')
        for p in problems[:60]:
            print('  ' + p)
        print(f'  всего проблем: {len(problems)}')
        return 1
    if not check_only:
        print('\nпишу файлы:')
        write_python(py_tasks)
        write_cpp(cpp_tasks)
    print('\nВСЁ СОВПАЛО: задачи валидны в движках и в настоящих python3/g++')
    return 0


if __name__ == '__main__':
    sys.exit(main())
