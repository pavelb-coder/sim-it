const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'dist', 'python-class.html'), 'utf8');
// пустой origin: localStorage недоступен — как в sandboxed iframe предпросмотра
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'about:blank', pretendToBeVisual: true });
const w = dom.window, d = w.document;
let errs = [];
w.addEventListener('error', e => errs.push(e.message));
const $ = s => d.querySelector(s);
function click(el){ el.dispatchEvent(new w.MouseEvent('click', {bubbles:true})); }
function fire(el, t){ el.dispatchEvent(new w.Event(t, {bubbles:true})); }
console.log('задач в списке:', d.querySelectorAll('.task-item').length);
console.log('заголовок открыт:', $('#taskTitle').textContent);
$('#code').value = w.PYTASKS[0].solution;
fire($('#code'), 'input');
click($('#btnCheck'));
console.log('проверка без localStorage:', /Все тесты пройдены/.test($('#panel-check').textContent));
console.log('прогресс:', $('#progressText').textContent);
console.log('ошибки страницы:', errs.length ? errs : 'нет');
