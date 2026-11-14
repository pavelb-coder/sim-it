// Проверка структуры задач и того, что эталонные решения проходят все свои тесты.
const path = require('path');
const Py = require(path.join(__dirname, '..', 'src', 'py.js'));
const { load } = require(path.join(__dirname, 'load_modules.js'));

const norm = s => String(s == null ? '' : s)
  .replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/[ \t]+$/, ''))
  .join('\n').replace(/\n+$/, '').trim();

const modules = load();
let fails = 0, total = 0, taskCount = 0;
const ids = new Set();

if (!modules.length) { console.log('НЕТ МОДУЛЕЙ'); process.exit(1); }

for (const m of modules) {
  if (!m.id || !m.title || !Array.isArray(m.tasks) || !m.tasks.length) {
    fails++; console.log('[?] модуль без id/title/tasks'); continue;
  }
  for (const t of m.tasks) {
    taskCount++;
    // структура
    const need = ['id', 'title', 'subtitle', 'theory', 'prompt', 'starter', 'hint', 'solution'];
    for (const f of need) if (!t[f]) { fails++; console.log(`[${m.id}/${t.id}] нет поля ${f}`); }
    if (ids.has(t.id)) { fails++; console.log(`[${m.id}] повторяющийся id задачи: ${t.id}`); }
    ids.add(t.id);
    if (!Array.isArray(t.tests) || t.tests.length < 3) { fails++; console.log(`[${t.id}] меньше 3 тестов`); }

    // эталон проходит свои тесты
    for (const test of t.tests) {
      total++;
      const r = Py.run(t.solution, { stdin: test.stdin === '' ? [] : test.stdin.split('\n') });
      if (!r.ok) { fails++; console.log(`[${t.id}] ОШИБКА В ЭТАЛОНЕ: ${r.error.kind}: ${r.error.msg} (стр. ${r.error.line})`); continue; }
      if (norm(r.output) !== norm(test.expected)) {
        fails++; console.log(`[${t.id}] РАСХОЖДЕНИЕ stdin=${JSON.stringify(test.stdin)} got=${JSON.stringify(r.output)} want=${JSON.stringify(test.expected)}`);
      }
    }

    // стартовый код не должен падать с внутренней ошибкой
    const rs = Py.run(t.starter, { stdin: t.tests[0].stdin === '' ? [] : t.tests[0].stdin.split('\n') });
    if (!rs.ok && rs.error.kind === 'InternalError') { fails++; console.log(`[${t.id}] стартовый код ломает движок: ${rs.error.msg}`); }

    // константа не должна проходить все тесты
    const uniq = new Set(t.tests.map(x => norm(x.expected)));
    if (uniq.size === 1 && t.tests.length > 1) {
      const cheat = 'print(' + JSON.stringify(t.tests[0].expected) + ')';
      const allPass = t.tests.every(test => {
        const r = Py.run(cheat, { stdin: test.stdin === '' ? [] : test.stdin.split('\n') });
        return r.ok && norm(r.output) === norm(test.expected);
      });
      if (allPass) { fails++; console.log(`[${t.id}] уязвимо к константе: все тесты с одинаковым выводом`); }
    }
  }
  console.log(`${m.title}: ${m.tasks.length} задач`);
}

console.log(`\nмодулей: ${modules.length}, задач: ${taskCount}, проверок: ${total}, провалов: ${fails}`);
process.exit(fails ? 1 : 0);
