import json, subprocess, sys, re
src = open('src/tasks.js', encoding='utf-8').read()
# грубо вытащим задачи: выполним JS-данные через node и получим JSON
out = subprocess.run(['node','-e','''
const t = require("/home/user/python-class/src/tasks.js");
console.log(JSON.stringify(t.map(x=>({id:x.id, solution:x.solution, tests:x.tests}))));
'''], capture_output=True, text=True)
tasks = json.loads(out.stdout)
norm = lambda s: '\n'.join(l.rstrip() for l in s.replace('\r','').split('\n')).rstrip().strip()
bad = 0
for t in tasks:
    for test in t['tests']:
        p = subprocess.run([sys.executable,'-c',t['solution']], input=test['stdin']+'\n', capture_output=True, text=True)
        if p.returncode != 0:
            bad += 1; print('[%s] CPython ошибка:' % t['id'], p.stderr.strip().splitlines()[-1]); continue
        if norm(p.stdout) != norm(test['expected']):
            bad += 1; print('[%s] ожидание не совпало: got %r want %r' % (t['id'], p.stdout, test['expected']))
print('расхождений с настоящим Python:', bad)
