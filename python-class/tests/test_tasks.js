const Py = require(require('path').join(__dirname, '..', 'src', 'py.js'));
const tasks = require(require('path').join(__dirname, '..', 'src', 'tasks.js'));
const norm = s => s.replace(/\r/g,'').split('\n').map(l=>l.replace(/[ \t]+$/,'')).join('\n').replace(/\n+$/,'').trim();
let fails = 0, total = 0;
for (const t of tasks) {
  // 1) эталон проходит свои тесты
  for (const test of t.tests) {
    total++;
    const r = Py.run(t.solution, { stdin: test.stdin.split('\n') });
    if (!r.ok) { fails++; console.log(`[${t.id}] SOLUTION ERROR`, r.error.kind, r.error.msg, 'line', r.error.line); continue; }
    if (norm(r.output) !== norm(test.expected)) { fails++; console.log(`[${t.id}] MISMATCH stdin=${JSON.stringify(test.stdin)} got=${JSON.stringify(r.output)} want=${JSON.stringify(test.expected)}`); }
  }
  // 2) стартовый код запускается без внутренних ошибок
  const rs = Py.run(t.starter, { stdin: t.tests[0].stdin.split('\n') });
  if (!rs.ok && !/EOFError|SyntaxError/.test(rs.error.kind)) { fails++; console.log(`[${t.id}] STARTER crash`, rs.error.kind, rs.error.msg); }
  // 3) глупое решение «вывести константу» не проходит все тесты
  const cheat = 'print(' + JSON.stringify(t.tests[0].expected) + ')';
  const allPass = t.tests.every(test => { const r = Py.run(cheat, { stdin: test.stdin.split('\n') }); return r.ok && norm(r.output) === norm(test.expected); });
  if (allPass && t.tests.length > 1) { fails++; console.log(`[${t.id}] ATTACKABLE: константа проходит все тесты`); }
  console.log(`${t.id}: ${t.title} — ${t.tests.length} тестов, эталон ок`);
}
console.log(`\nвсего проверок: ${total}, провалов: ${fails}`);
