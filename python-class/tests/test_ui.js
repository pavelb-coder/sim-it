// Интерфейс в jsdom: запуск, автопроверка, трейс, прогресс, модули, блокировки.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'python-class.html'), 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.org/', pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;
const $ = s => doc.querySelector(s);
const $$ = s => Array.from(doc.querySelectorAll(s));
let fails = 0;
const check = (name, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL:', name, extra === undefined ? '' : extra); }
  else console.log('ok  :', name);
};
const fire = (el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

const MODULES = window.PYMODULES;
const T = MODULES.flatMap(m => m.tasks);

check('заголовок', $('.logo').textContent.includes('Python-класс'));
check('модулей 6', MODULES.length === 6, MODULES.length);
check('задач 39', T.length === 39, T.length);
check('заголовков модулей в сайдбаре', $$('.module-head').length === 6, $$('.module-head').length);
check('элементов задач в сайдбаре', $$('.task-item').length === 39, $$('.task-item').length);
check('первая задача открыта', $('#taskTitle').textContent === T[0].title, $('#taskTitle').textContent);
check('чип модуля показан', $('#taskModule').textContent.includes('Модуль 1'), $('#taskModule').textContent);
check('вторая задача заблокирована', $$('.task-item')[1].className.includes('locked'));
check('подсветка кода работает', $('#codeHl').innerHTML.includes('tok-'));

// --- запуск и проверка первой задачи
$('#code').value = T[0].solution;
fire($('#code'), 'input');
$('#stdin').value = '3';
click($('#btnRun'));
check('вывод после запуска', $('#panel-out').textContent.includes('9') && $('#panel-out').textContent.includes('27'));
check('трейс построен', $$('#panel-vars .trace-row').length > 0);
click($('#btnCheck'));
check('автопроверка: все тесты', /Все тесты пройдены: 4 из 4/.test($('#panel-check').textContent), $('#panel-check').textContent.slice(0, 100));
check('эталон показан', $('#panel-check').textContent.includes('Эталонное решение'));
check('прогресс 1 из 39', /1/.test($('#progressText').textContent) && /39/.test($('#progressText').textContent), $('#progressText').textContent);
check('счётчик модуля 1/10', $('.module-head .m-count').textContent === '1/10', $('.module-head .m-count').textContent);
check('следующая задача разблокирована', !$$('.task-item')[1].className.includes('locked'));
check('localStorage сохранён', (window.localStorage.getItem('pyclass.v1') || '').includes(T[0].id));

// --- неверное решение и ошибка в коде
const codeEl = $('#code');
codeEl.value = 'print("угадал")';
fire(codeEl, 'input');
click($('#btnCheck'));
check('провал проверки виден', /Пройдено 0 из 4/.test($('#panel-check').textContent));
check('показаны ожидалось/получено', $('#panel-check').textContent.includes('ожидалось') && $('#panel-check').textContent.includes('получено'));
codeEl.value = 'print(n)';
fire(codeEl, 'input');
click($('#btnRun'));
check('NameError с номером строки', /NameError/.test($('#panel-out').textContent) && /строка 1/.test($('#panel-out').textContent));
codeEl.value = 'while True:\n    pass';
fire(codeEl, 'input');
click($('#btnRun'));
check('защита от бесконечного цикла', /слишком долго/.test($('#panel-out').textContent));

// --- переход по модулям
click($('#btnShowAll'));
check('режим «все задачи» открывает 39', $$('.task-item.locked').length === 0);
const m6first = 34; // первая задача модуля 6
click($$('.task-item')[m6first]);
check('открылась задача модуля 6', $('#taskModule').textContent.includes('Модуль 6'), $('#taskModule').textContent);
check('чип уровня показан', ['легко', 'средне', 'сложно', ''].includes($('#taskLevel').textContent), $('#taskLevel').textContent);

// --- все 39 эталонов проходят автопроверку через интерфейс
let allPass = true;
T.forEach((t, i) => {
  click($$('.task-item')[i]);
  $('#code').value = t.solution;
  fire($('#code'), 'input');
  click($('#btnCheck'));
  if (!/Все тесты пройдены/.test($('#panel-check').textContent)) {
    allPass = false;
    console.log('  не прошла:', t.id, t.title, '→', $('#panel-check').textContent.slice(0, 160));
  }
});
check('все 39 эталонов проходят автопроверку', allPass);
check('прогресс 39 из 39', /39/.test($('#progressText').textContent), $('#progressText').textContent);

console.log('\nпровалов:', fails);
process.exit(fails ? 1 : 0);
