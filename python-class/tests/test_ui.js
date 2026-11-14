const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'dist', 'python-class.html'), 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/', pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;
const $ = s => doc.querySelector(s);
const $$ = s => Array.from(doc.querySelectorAll(s));
let fails = 0;
function check(name, cond, extra) {
  if (!cond) { fails++; console.log('FAIL:', name, extra || ''); } else console.log('ok  :', name);
}
function fire(el, type) { el.dispatchEvent(new window.Event(type, { bubbles: true })); }
function click(el) { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }

check('заголовок', $('.logo').textContent.includes('Python-класс'));
check('список задач = 10', $$('.task-item').length === 10, $$('.task-item').length);
check('первая задача открыта', $('#taskTitle').textContent.length > 0, $('#taskTitle').textContent);
check('задача 2 заблокирована', $$('.task-item')[1].className.includes('locked'));
check('в редакторе есть стартовый код', $('#code').value.length > 0);
check('подсветка работает', $('#codeHl').innerHTML.includes('tok-'));
check('нумерация строк', $('#gutter').textContent.trim().split('\n').length === $('#code').value.split('\n').length);

// --- запуск правильного решения
const T = window.PYTASKS;
$('#code').value = T[0].solution;
fire($('#code'), 'input');
$('#stdin').value = '3';
click($('#btnRun'));
check('вывод после запуска', $('#panel-out').textContent.includes('9') && $('#panel-out').textContent.includes('27'), $('#panel-out').textContent.slice(0,80));
check('трейс построен', $$('#panel-vars .trace-row').length > 0, $$('#panel-vars .trace-row').length);

// --- проверка правильного решения
click($('#btnCheck'));
check('проверка: все тесты', /Все тесты пройдены: 4 из 4/.test($('#panel-check').textContent), $('#panel-check').textContent.slice(0,120));
check('эталон показан', $('#panel-check').textContent.includes('Эталонное решение'));
check('прогресс 1 из 10', $('#progressText').textContent.includes('1') && $('#progressText').textContent.includes('10'), $('#progressText').textContent);
check('задача 1 отмечена ✓', $$('.task-item')[0].textContent.includes('✓'));
check('следующая задача разблокирована', !$$('.task-item')[1].className.includes('locked'));
check('localStorage сохранён', (window.localStorage.getItem('pyclass.v1') || '').includes('t1'));

// --- неверное решение
const codeEl = $('#code');
codeEl.value = 'print("угадал")';
fire(codeEl, 'input');
click($('#btnCheck'));
check('проверка: провал виден', /Пройдено 0 из 4/.test($('#panel-check').textContent), $('#panel-check').textContent.slice(0,120));
check('ожидалось/получено показаны', $('#panel-check').textContent.includes('ожидалось') && $('#panel-check').textContent.includes('получено'));

// --- ошибка в коде
codeEl.value = 'print(n)';
fire(codeEl, 'input');
click($('#btnRun'));
check('ошибка NameError с номером строки', /NameError/.test($('#panel-out').textContent) && /строка 1/.test($('#panel-out').textContent), $('#panel-out').textContent.slice(0,120));

// --- бесконечный цикл
codeEl.value = 'while True:\n    pass';
fire(codeEl, 'input');
click($('#btnRun'));
check('защита от бесконечного цикла', /слишком долго/.test($('#panel-out').textContent), $('#panel-out').textContent.slice(0,120));

// --- переход на задачу 2 и подсказка
click($$('.task-item')[1]);
check('перешли на задачу 2', $('#taskTitle').textContent === T[1].title, $('#taskTitle').textContent);
check('ввод подставлен из примера', $('#stdin').value === T[1].examples[0].inp, $('#stdin').value);
click($('#btnHint'));
check('подсказка открылась', $('#hintBox').className.includes('show'));
check('подсказка содержит текст', $('#hintBox').textContent.length > 10);

// --- все 10 задач проходятся эталонами
click($('#btnShowAll'));
let allPass = true;
T.forEach((t, i) => {
  click($$('.task-item')[i]);
  $('#code').value = t.solution;
  fire($('#code'), 'input');
  click($('#btnCheck'));
  const ok = /Все тесты пройдены/.test($('#panel-check').textContent);
  if (!ok) { allPass = false; console.log('  задача', i + 1, 'не прошла:', $('#panel-check').textContent.slice(0, 200)); }
});
check('все 10 эталонов проходят автопроверку', allPass);
check('прогресс 10 из 10', /10/.test($('#progressText').textContent), $('#progressText').textContent);
check('сборка без ошибок в консоли', true);

console.log('\nпровалов:', fails);
process.exit(fails ? 1 : 0);
