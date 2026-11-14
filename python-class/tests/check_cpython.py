#!/usr/bin/env python3
"""Сверка с настоящим Python: каждое эталонное решение прогоняется в CPython,
его вывод сравнивается с ожидаемым в задаче. Это защита от того, что тесты
подогнаны под самодельный движок, а не под реальный Python."""
import json
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DUMP = r'''
const { load } = require(process.env.LOADER);
const mods = load();
const out = [];
for (const m of mods) for (const t of m.tasks) out.push({
  id: t.id, module: m.id, solution: t.solution, starter: t.starter, tests: t.tests
});
console.log(JSON.stringify(out));
'''


def norm(s: str) -> str:
    lines = [line.rstrip() for line in s.replace('\r', '').split('\n')]
    return '\n'.join(lines).rstrip().strip()


def main() -> int:
    env_loader = str(BASE / 'tests' / 'load_modules.js')
    proc = subprocess.run(['node', '-e', DUMP], capture_output=True, text=True,
                          env={**__import__('os').environ, 'LOADER': env_loader})
    if proc.returncode != 0:
        print('не удалось прочитать задачи:', proc.stderr.strip()[:300])
        return 1
    tasks = json.loads(proc.stdout)

    bad = 0
    checked = 0
    for t in tasks:
        for test in t['tests']:
            checked += 1
            run = subprocess.run([sys.executable, '-c', t['solution']],
                                 input=test['stdin'] + '\n', capture_output=True, text=True)
            if run.returncode != 0:
                bad += 1
                print(f"[{t['id']}] CPython не выполнил эталон: {run.stderr.strip().splitlines()[-1]}")
                continue
            if norm(run.stdout) != norm(test['expected']):
                bad += 1
                print(f"[{t['id']}] ожидание не совпало с CPython: stdin={test['stdin']!r} "
                      f"got={run.stdout!r} want={test['expected']!r}")
        # стартовый код должен быть синтаксически корректным Python
        starter = subprocess.run([sys.executable, '-c', 'import ast,sys; ast.parse(sys.stdin.read())'],
                                 input=t['starter'], capture_output=True, text=True)
        if starter.returncode != 0:
            bad += 1
            print(f"[{t['id']}] стартовый код — невалидный Python: {starter.stderr.strip().splitlines()[-1]}")

    print(f'задач: {len(tasks)}, прогонов в CPython: {checked}, расхождений: {bad}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
