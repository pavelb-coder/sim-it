#!/usr/bin/env python3
"""Тесты C++-класса: движок сверяется с настоящим g++ и с ожидаемыми ответами задач.

    python3 products/cpp/test.py        (или ./products/cpp/test.sh)
"""
import json, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
TASKS = ROOT / "products/cpp/tasks.js"
BANK = ROOT / "products/cpp/tasks-bank.js"
ENGINE = ROOT / "products/cpp/engine.js"

# короткие программы, на которых сверяемся с g++ (не входят в задачи)
SNIPPETS = [
    ("hello", 'cout << "Hello" << endl;'),
    ("types", 'int a = 7, b = 2; cout << a / b << " " << a % b << " " << a * 1.0 / b;'),
    ("double", 'double x = 1.0 / 3; cout << x << " " << 2.5 * 2;'),
    ("loop", 'int s = 0; for (int i = 1; i <= 10; i++) s += i; cout << s;'),
    ("while", 'int n = 1234, c = 0; while (n > 0) { n /= 10; c++; } cout << c;'),
    ("array", 'int a[5] = {3, 7, 1, 9, 4}; int mx = a[0]; for (int i = 1; i < 5; i++) if (a[i] > mx) mx = a[i]; cout << mx;'),
    ("matrix", 'int m[2][2] = {{1,2},{3,4}}; cout << m[1][0];'),
    ("vector", 'vector<int> v; for (int i = 1; i <= 4; i++) v.push_back(i*i); cout << v.size() << ": "; for (int i = 0; i < v.size(); i++) cout << v[i] << " ";'),
    ("string", 'string s = "kvantum"; cout << s.size() << " " << s.substr(0, 3);'),
    ("func", 'cout << max3(3, 9, 5);', 'int max3(int a, int b, int c){ if (a > b && a > c) return a; if (b > c) return b; return c; }\n'),
    ("recursion", 'cout << fact(6);', 'int fact(int n){ if (n <= 1) return 1; return n * fact(n - 1); }\n'),
    ("char", "char c = 'A'; cout << c << ' ' << (int)c << ' ' << (char)(c + 1);"),
    ("bool", 'bool f = true; cout << f << " " << (!f) << " " << (3 > 2);'),
    ("auto", 'auto x = 3; auto y = 2.5; cout << x << " " << y;'),
    ("ternary", 'int a = 5, b = 9; cout << (a > b ? a : b);'),
]


def node_json(code: str):
    out = subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def norm(s: str) -> str:
    lines = str(s).replace('\r\n', '\n').replace('\r', '\n').split('\n')
    lines = [ln.rstrip(' \t') for ln in lines]
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines).strip()


def load_tasks():
    return node_json(f"""
const fs = require('fs');
global.window = {{}};
eval(fs.readFileSync({json.dumps(str(TASKS))}, 'utf8'));
if (fs.existsSync({json.dumps(str(BANK))})) eval(fs.readFileSync({json.dumps(str(BANK))}, 'utf8'));
console.log(JSON.stringify(window.CPP_TASKS.map(t => ({{id: t.id, title: t.title,
  solution: t.solution, tests: t.tests}}))));
""")


def engine_run(code, stdin):
    res = node_json(f"""
const engine = require({json.dumps(str(ENGINE))});
const r = engine.run({json.dumps(code)}, {json.dumps(stdin)});
console.log(JSON.stringify(r));
""")
    return res


def have_gpp():
    return shutil.which("g++") is not None


def gpp_run(code, stdin, td):
    src = pathlib.Path(td) / "prog.cpp"
    exe = pathlib.Path(td) / "prog"
    src.write_text(code, encoding="utf-8")
    cp = subprocess.run(["g++", "-std=c++17", "-O0", "-o", str(exe), str(src)], capture_output=True, text=True)
    if cp.returncode != 0:
        return None, cp.stderr.strip().splitlines()[0] if cp.stderr.strip() else "ошибка компиляции"
    run = subprocess.run([str(exe)], input=stdin.encode(), capture_output=True)
    return run.stdout.decode("utf-8", "replace"), None


def main():
    bad = 0
    tasks = load_tasks()
    total = sum(len(t["tests"]) for t in tasks)
    print(f"задач: {len(tasks)}, тестов: {total}")

    print("== движок × ожидаемые ответы ==")
    for t in tasks:
        for test in t["tests"]:
            r = engine_run(t["solution"], test["stdin"] or "")
            if not r["ok"]:
                print(f"  ПРОВАЛ {t['id']}: {r['error']} (стр {r['line']})")
                bad += 1
            elif norm(r["output"]) != norm(test["expected"]):
                print(f"  ПРОВАЛ {t['id']}: ожидалось {test['expected']!r}, получено {r['output']!r}")
                bad += 1
    print(f"  {'всё совпало' if bad == 0 else 'есть ошибки'}")

    if not have_gpp():
        print("== g++ не найден — сверка с настоящим компилятором пропущена ==")
        return 1 if bad else 0

    print("== движок × g++ ==")
    gbad = 0
    with tempfile.TemporaryDirectory() as td:
        for t in tasks:
            for test in t["tests"]:
                out, err = gpp_run(t["solution"], test["stdin"] or "", td)
                if err:
                    print(f"  g++ не собрал {t['id']}: {err}")
                    gbad += 1
                elif norm(out) != norm(test["expected"]):
                    print(f"  ПРОВАЛ {t['id']} (g++): ожидалось {test['expected']!r}, g++ дал {out!r}")
                    gbad += 1

        prelude = ("#include <iostream>\n#include <string>\n#include <vector>\n#include <cmath>\n"
                   "using namespace std;\n")
        for item in SNIPPETS:
            name, body = item[0], item[1]
            pre = item[2] if len(item) > 2 else ""
            code = prelude + pre + "int main() {\n" + body + "\nreturn 0;\n}\n"
            out, err = gpp_run(code, "", td)
            r = engine_run(code, "")
            if err:
                print(f"  ПРОВАЛ {name}: g++ не собрал — {err}")
                gbad += 1
            elif not r["ok"]:
                print(f"  ПРОВАЛ {name}: движок — {r['error']} (стр {r['line']})")
                gbad += 1
            elif r["output"] != out:
                print(f"  ПРОВАЛ {name}: g++ = {out!r}, движок = {r['output']!r}")
                gbad += 1
    print(f"  {'всё совпало с g++' if gbad == 0 else 'есть расхождения'}")
    return 1 if (bad or gbad) else 0


if __name__ == "__main__":
    sys.exit(main())
