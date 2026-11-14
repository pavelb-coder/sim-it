#!/usr/bin/env python3
"""Тесты мини-компилятора C++.

1) Эталонные решения всех задач проходят свои тесты (нужен только node).
2) Дифференциальный тест: эта же программа через g++ и через наш интерпретатор —
   вывод должен совпасть строку в строку (нужен g++, иначе шаг пропускается).

    python3 products/cpp/tests/run_tests.py
"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
CPP = ROOT / 'products' / 'cpp'
ENGINE = CPP / 'engine.js'
TASKS = CPP / 'tasks.js'
CASES = CPP / 'tests' / 'cases.json'

RUNNER = r"""
const fs = require('fs');
eval(fs.readFileSync(process.env.ENGINE, 'utf8'));
const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const t = { input: payload.stdin };
const norm = s => String(s).replace(/\r/g, '').split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
const out = payload.items.map(item => {
  const res = CppEngine.run(item.program, item.stdin || '');
  const err = res.compileError || res.runtimeError;
  return { ok: res.ok, output: res.output, normalized: err ? null : norm(res.output), error: err };
});
process.stdout.write(JSON.stringify(out));
"""


def run_engine(items):
    payload = json.dumps({'items': items}).encode()
    p = subprocess.run(['node', '-e', RUNNER], input=payload, capture_output=True,
                       env={'ENGINE': str(ENGINE), 'PATH': '/usr/bin:/bin:/usr/local/bin'},
                       timeout=180)
    if p.returncode != 0:
        raise SystemExit('node упал: ' + p.stderr.decode()[-800:])
    return json.loads(p.stdout)


def norm(s):
    return '\n'.join(l.rstrip() for l in s.replace('\r', '').split('\n')).rstrip('\n')


def main():
    fails = 0

    # --- 1. эталоны задач ---
    tasks_js = TASKS.read_text(encoding='utf-8')
    js = ("const fs=require('fs'); global.window={};"
          "eval(fs.readFileSync(process.env.E, 'utf8'));"
          "eval(fs.readFileSync(process.env.T, 'utf8'));"
          "console.log(JSON.stringify(window.CPP_TASKS));")
    p = subprocess.run(['node', '-e', js], capture_output=True, text=True,
                       env={'E': str(ENGINE), 'T': str(TASKS), 'PATH': '/usr/bin:/bin:/usr/local/bin'})
    tasks = json.loads(p.stdout)
    items, expect = [], []
    for t in tasks:
        for tc in t['tests']:
            items.append({'program': t['solution'], 'stdin': tc['input']})
            expect.append((t['id'], norm(tc['expected'])))
    results = run_engine(items)
    for (tid, want), got in zip(expect, results):
        if not got['ok']:
            print(f'  ✖ {tid}: {got["error"]}')
            fails += 1
        elif got['normalized'] != want:
            print(f'  ✖ {tid}: ожидалось {want!r}, получено {got["normalized"]!r}')
            fails += 1
    print(f'эталоны задач: {len(items) - fails}/{len(items)} тестов пройдено')

    # --- 2. дифференциальный тест с g++ ---
    if not shutil.which('g++'):
        print('g++ не найден — дифференциальный тест пропущен')
    else:
        cases = json.loads(CASES.read_text(encoding='utf-8'))
        results = run_engine([{'program': c['program'], 'stdin': c['stdin']} for c in cases])
        diff_ok, diff_bad = 0, 0
        for i, (case, got) in enumerate(zip(cases, results), 1):
            d = tempfile.mkdtemp()
            f = pathlib.Path(d) / 'm.cpp'
            f.write_text(case['program'], encoding='utf-8')
            exe = pathlib.Path(d) / 'a.out'
            c = subprocess.run(['g++', '-std=c++17', '-O0', '-o', str(exe), str(f)],
                               capture_output=True, text=True)
            if c.returncode != 0:
                print(f'  case {i}: g++ не собрал — пропуск ({c.stderr.splitlines()[:1]})')
                continue
            ref = subprocess.run([str(exe)], input=case['stdin'], capture_output=True, text=True, timeout=30).stdout
            if not got['ok']:
                print(f'  case {i}: наш интерпретатор упал: {got["error"]}')
                diff_bad += 1
            elif got['normalized'] != norm(ref):
                print(f'  case {i}: расхождение\n    g++: {ref!r}\n    наш: {got["output"]!r}')
                diff_bad += 1
            else:
                diff_ok += 1
        print(f'дифференциальный тест с g++: {diff_ok} совпало, {diff_bad} проблем')
        fails += diff_bad

    print('ВСЁ ЗЕЛЁНОЕ' if fails == 0 else f'ПРОБЛЕМ: {fails}')
    return 0 if fails == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
