/* ==========================================================================
   Веб-студия — банк задач: 16 заданий на разметку и CSS.
   Проверка разбирает готовую страницу (DOM) и правила CSS, а не текст программы.
   ========================================================================== */
(function (global) {
  'use strict';

  function root(html) {
    return new DOMParser().parseFromString('<div id="__root">' + html + '</div>', 'text/html')
      .getElementById('__root');
  }
  function all(html, sel) { return Array.prototype.slice.call(root(html).querySelectorAll(sel)); }
  function cssHas(css, re) { return re.test(String(css).replace(/\s+/g, ' ').toLowerCase()); }
  function txt(el) { return el ? String(el.textContent || '').trim() : ''; }

  var bank = [
    {
      id: 'w7', level: 'легко',
      title: 'Три абзаца',
      subtitle: 'несколько p подряд',
      theory: '<p>Одинаковые теги можно повторять: каждый <code>&lt;p&gt;</code> — отдельный абзац со своими отступами.</p>' +
        '<p>Браузер добавляет между абзацами пустое место сам, поэтому разметка остаётся короткой.</p>',
      prompt: 'Сделай страницу с заголовком <code>Мои увлечения</code> и <b>тремя абзацами</b> текста.',
      examples: [{ label: 'критерии', text: 'один h1 · три p, в каждом больше 10 символов' }],
      hint: '<h1>Мои увлечения</h1>\\n<p>Первый абзац про роботов и схемы.</p>\\n<p>Второй — про игры и код.</p>\\n<p>Третий — про спорт.</p>',
      starter: { html: '<h1>Мои увлечения</h1>\n<p></p>\n', css: '' },
      solution: {
        html: '<h1>Мои увлечения</h1>\n<p>Собираю роботов из конструктора.</p>\n' +
              '<p>Пишу игры на Python и C++.</p>\n<p>Ещё хожу на плавание.</p>',
        css: ''
      },
      checks: [
        { label: 'есть заголовок h1', fn: function (html) { return all(html, 'h1').length >= 1; } },
        {
          label: 'есть три абзаца p, в каждом есть текст',
          fn: function (html) {
            var ps = all(html, 'p');
            return ps.length >= 3 && ps.slice(0, 3).every(function (p) { return txt(p).length > 10; });
          }
        }
      ]
    },
    {
      id: 'w8', level: 'легко',
      title: 'Нумерованный список',
      subtitle: 'ol и li',
      theory: '<p><code>&lt;ol&gt;</code> — упорядоченный список: браузер сам нумерует пункты <code>&lt;li&gt;</code>.</p>' +
        '<p>Если важен порядок шагов (рецепт, инструкция) — это <code>ol</code>. Если порядок не важен — <code>ul</code>.</p>',
      prompt: 'Сделай <b>нумерованный список из четырёх пунктов</b> — шаги «Как запустить программу».',
      examples: [{ label: 'критерии', text: 'один ol · минимум четыре li с текстом' }],
      hint: '<ol>\\n  <li>Открыть редактор</li>\\n  …\\n</ol>',
      starter: { html: '<h2>Как запустить программу</h2>\n<ol>\n  <li></li>\n</ol>', css: '' },
      solution: {
        html: '<h2>Как запустить программу</h2>\n<ol>\n  <li>Открыть редактор кода</li>\n' +
              '  <li>Написать программу</li>\n  <li>Проверить, что нет ошибок</li>\n  <li>Нажать «Запустить»</li>\n</ol>',
        css: ''
      },
      checks: [
        { label: 'есть нумерованный список ol', fn: function (html) { return all(html, 'ol').length === 1; } },
        {
          label: 'в списке не меньше четырёх пунктов li',
          fn: function (html) {
            var li = all(html, 'ol li');
            return li.length >= 4 && li.every(function (x) { return txt(x).length > 2; });
          }
        }
      ]
    },
    {
      id: 'w9', level: 'средне',
      title: 'Вложенный список',
      subtitle: 'список внутри списка',
      theory: '<p>Внутренний список кладут <b>внутрь</b> пункта <code>&lt;li&gt;</code>, а не рядом с ним. Так появляется структура «тема → подтемы».</p>' +
        '<p>Каждый уровень вложенности получает свой отступ — дерево видно сразу.</p>',
      prompt: 'Сделай список направлений, где у пункта «Программирование» есть <b>вложенный список</b> из двух пунктов.',
      examples: [{ label: 'критерии', text: 'внешний ul с 2+ li · внутри одного li есть ещё один ul с 2+ li' }],
      hint: '<ul>\\n  <li>Программирование\\n    <ul><li>Python</li><li>C++</li></ul>\\n  </li>\\n  <li>Робототехника</li>\\n</ul>',
      starter: { html: '<ul>\n  <li>Программирование\n    <ul>\n    </ul>\n  </li>\n</ul>', css: '' },
      solution: {
        html: '<ul>\n  <li>Программирование\n    <ul>\n      <li>Python</li>\n      <li>C++</li>\n    </ul>\n  </li>\n' +
              '  <li>Робототехника</li>\n</ul>',
        css: ''
      },
      checks: [
        {
          label: 'есть внешний список с двумя и более пунктами',
          fn: function (html) { return all(html, 'ul').length >= 1 && all(html, 'ul')[0].querySelectorAll(':scope > li').length >= 2; }
        },
        {
          label: 'внутри пункта есть вложенный список с двумя пунктами',
          fn: function (html) {
            var inner = all(html, 'ul li ul');
            return inner.length >= 1 && inner[0].querySelectorAll(':scope > li').length >= 2;
          }
        }
      ]
    },
    {
      id: 'w10', level: 'средне',
      title: 'Таблица',
      subtitle: 'table, th, td, tr',
      theory: '<p>Таблица собирается из строк <code>&lt;tr&gt;</code>. В первой строке — заголовки <code>&lt;th&gt;</code>, дальше ячейки <code>&lt;td&gt;</code>.</p>' +
        '<p>Браузер рисует рамки только если их попросить в CSS: <code>table { border-collapse: collapse; }</code>. А без <code>border</code> у ячеек получится «голая» сетка.</p>',
      prompt: 'Сделай таблицу расписания: <b>две колонки-заголовка</b> («День», «Занятие») и <b>две строки данных</b>.',
      examples: [{ label: 'критерии', text: 'один table · 2 th · не меньше 4 td' }],
      hint: '<table>\\n  <tr><th>День</th><th>Занятие</th></tr>\\n  <tr><td>Пн</td><td>Python</td></tr>\\n</table>',
      starter: { html: '<table>\n  <tr><th>День</th><th>Занятие</th></tr>\n</table>', css: '' },
      solution: {
        html: '<table>\n  <tr><th>День</th><th>Занятие</th></tr>\n  <tr><td>Понедельник</td><td>Python</td></tr>\n' +
              '  <tr><td>Среда</td><td>Робототехника</td></tr>\n</table>',
        css: 'table { border-collapse: collapse; }\ntd, th { border: 1px solid #888; padding: 6px 10px; }'
      },
      checks: [
        { label: 'есть таблица', fn: function (html) { return all(html, 'table').length === 1; } },
        { label: 'два заголовка th', fn: function (html) { return all(html, 'th').length >= 2; } },
        { label: 'не меньше четырёх ячеек td', fn: function (html) { return all(html, 'td').length >= 4; } }
      ]
    },
    {
      id: 'w11', level: 'легко',
      title: 'Ссылка на почту',
      subtitle: 'a href="mailto:"',
      theory: '<p>Атрибут <code>href</code> задаёт адрес ссылки. Кроме сайтов бывают схемы: <code>mailto:</code> — письмо, <code>tel:</code> — звонок.</p>' +
        '<p>Если адрес в <code>mailto:</code> написан правильно, клик откроет почтовую программу с готовым получателем.</p>',
      prompt: 'Сделай страницу с заголовком <code>Связаться</code> и ссылкой, которая открывает письмо на адрес <code>info@kvantum.ru</code>.',
      examples: [{ label: 'критерии', text: 'один a с href, начинающимся на mailto:info@kvantum.ru' }],
      hint: '<a href="mailto:info@kvantum.ru">Написать нам</a>',
      starter: { html: '<h1>Связаться</h1>\n<a href="">Написать нам</a>', css: '' },
      solution: {
        html: '<h1>Связаться</h1>\n<p>Пишите по любым вопросам.</p>\n<a href="mailto:info@kvantum.ru">Написать нам</a>',
        css: ''
      },
      checks: [
        {
          label: 'есть ссылка с mailto:info@kvantum.ru',
          fn: function (html) {
            var as = all(html, 'a');
            return as.length >= 1 && as.some(function (a) {
              return String(a.getAttribute('href') || '').toLowerCase().indexOf('mailto:info@kvantum.ru') === 0;
            });
          }
        },
        { label: 'у ссылки есть видимый текст', fn: function (html) { return all(html, 'a').some(function (a) { return txt(a).length > 2; }); } }
      ]
    },
    {
      id: 'w12', level: 'средне',
      title: 'Картинка с описанием',
      subtitle: 'img src и alt',
      theory: '<p>У <code>&lt;img&gt;</code> нет закрывающего тега: всё задаётся атрибутами. <code>src</code> — откуда взять файл, <code>alt</code> — текстовое описание.</p>' +
        '<p><code>alt</code> нужен не «для галочки»: его читают программы для незрячих людей и он появляется, если картинка не загрузилась.</p>',
      prompt: 'Вставь картинку: <code>src</code> с любым адресом (можно <code>robot.png</code>), осмысленный <code>alt</code> и CSS-класс, который задаёт ширину.',
      examples: [{ label: 'критерии', text: 'один img с непустым src и alt длиннее 3 символов · в CSS правило для класса картинки' }],
      hint: '<img class="pic" src="robot.png" alt="Робот из конструктора">\n.pic { width: 240px; }',
      starter: { html: '<h2>Наш робот</h2>\n<img class="pic" src="" alt="">', css: '.pic { }' },
      solution: {
        html: '<h2>Наш робот</h2>\n<img class="pic" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'60\'%3E%3Crect width=\'80\' height=\'60\' fill=\'%235aa9ff\'/%3E%3C/svg%3E" alt="Синий прямоугольник вместо фото робота">\n<p>Собрали за два занятия.</p>',
        css: '.pic { width: 240px; border-radius: 8px; }'
      },
      checks: [
        {
          label: 'есть картинка с непустым src',
          fn: function (html) {
            return all(html, 'img').some(function (i) { return String(i.getAttribute('src') || '').trim().length > 0; });
          }
        },
        {
          label: 'у картинки осмысленный alt (длиннее трёх символов)',
          fn: function (html) {
            return all(html, 'img').some(function (i) { return String(i.getAttribute('alt') || '').trim().length > 3; });
          }
        },
        {
          label: 'в CSS у класса картинки задана ширина',
          fn: function (html, css) { return /\.pic\s*\{[^}]*width\s*:/i.test(String(css)); }
        }
      ]
    },
    {
      id: 'w13', level: 'средне',
      title: 'Поле и кнопка',
      subtitle: 'input и button',
      theory: '<p>Форма в минимуме — это <code>&lt;input&gt;</code> и <code>&lt;button&gt;</code>. Атрибут <code>placeholder</code> подсказывает, что вводить.</p>' +
        '<p>Кнопка внутри формы по умолчанию отправляет данные. Саму отправку обрабатывают скриптом, но разметка уже рабочая.</p>',
      prompt: 'Сделай форму подписки: заголовок, поле ввода с подсказкой <code>ваш e-mail</code> и кнопку с текстом <code>Подписаться</code>.',
      examples: [{ label: 'критерии', text: 'один input с placeholder · одна button с текстом «Подписаться»' }],
      hint: '<input placeholder="ваш e-mail">\\n<button>Подписаться</button>',
      starter: { html: '<h2>Подписка на новости</h2>\n<form>\n  <input>\n  <button></button>\n</form>', css: '' },
      solution: {
        html: '<h2>Подписка на новости</h2>\n<form>\n  <input type="email" placeholder="ваш e-mail">\n  <button>Подписаться</button>\n</form>',
        css: 'input { padding: 6px 10px; }\nbutton { padding: 6px 14px; }'
      },
      checks: [
        {
          label: 'есть поле ввода с подсказкой',
          fn: function (html) {
            return all(html, 'input').some(function (i) { return String(i.getAttribute('placeholder') || '').length > 3; });
          }
        },
        {
          label: 'есть кнопка с текстом «Подписаться»',
          fn: function (html) {
            return all(html, 'button').some(function (b) { return txt(b).toLowerCase().indexOf('подписаться') >= 0; });
          }
        }
      ]
    },
    {
      id: 'w14', level: 'средне',
      title: 'Подпись к полю',
      subtitle: 'label и id',
      theory: '<p><code>&lt;label for="почта"&gt;</code> связывается с полем через <code>id</code>. Тогда щелчок по подписи ставит курсор в поле.</p>' +
        '<p>Это вопрос доступности: без подписи человек не понимает, что вводить, а программы для незрячих не могут прочитать поле.</p>',
      prompt: 'Сделай поле «Ваше имя»: подпись <code>&lt;label&gt;</code>, связанная с полем через <code>for</code> и <code>id</code>.',
      examples: [{ label: 'критерии', text: 'label с for · input с тем же id' }],
      hint: '<label for="имя">Ваше имя</label>\\n<input id="имя">',
      starter: { html: '<label for="">Ваше имя</label>\n<input id="">', css: '' },
      solution: {
        html: '<form>\n  <label for="имя">Ваше имя</label>\n  <input id="имя" placeholder="Как тебя зовут">\n</form>',
        css: 'label { display: block; margin-bottom: 4px; }'
      },
      checks: [
        {
          label: 'у label заполнен for',
          fn: function (html) {
            return all(html, 'label').some(function (l) { return String(l.getAttribute('for') || '').length > 0; });
          }
        },
        {
          label: 'есть поле с таким же id',
          fn: function (html) {
            var labels = all(html, 'label');
            return labels.some(function (l) {
              var id = l.getAttribute('for');
              return !!id && !!root(html).querySelector('#' + CSS.escape(id));
            });
          }
        }
      ]
    },
    {
      id: 'w15', level: 'средне',
      title: 'Каркас страницы',
      subtitle: 'header, main, footer',
      theory: '<p>Семантические теги описывают <b>роль</b> блока: <code>header</code> — шапка, <code>main</code> — основное содержимое, <code>footer</code> — подвал.</p>' +
        '<p>Для браузера они выглядят как обычные блоки, но для поисковиков, программ чтения с экрана и других разработчиков структура становится понятной.</p>',
      prompt: 'Собери каркас: <code>header</code> с названием сайта, <code>main</code> с абзацем и <code>footer</code> с подписью.',
      examples: [{ label: 'критерии', text: 'есть header, main и footer, в каждом есть текст' }],
      hint: '<header>Квантум</header>\\n<main><p>…</p></main>\\n<footer>2024</footer>',
      starter: { html: '<header></header>\n<main></main>\n<footer></footer>', css: '' },
      solution: {
        html: '<header><h1>Квантум</h1></header>\n<main>\n  <p>Мы учимся программировать и собирать роботов.</p>\n</main>\n<footer>IT-квантум, 2024</footer>',
        css: 'header, footer { padding: 12px; background: #eef; }\nmain { padding: 12px; }'
      },
      checks: [
        { label: 'есть header с текстом', fn: function (html) { return all(html, 'header').some(function (h) { return txt(h).length > 0; }); } },
        { label: 'есть main с текстом', fn: function (html) { return all(html, 'main').some(function (m) { return txt(m).length > 10; }); } },
        { label: 'есть footer с текстом', fn: function (html) { return all(html, 'footer').some(function (f) { return txt(f).length > 0; }); } }
      ]
    },
    {
      id: 'w16', level: 'легко',
      title: 'Цвет текста',
      subtitle: 'color',
      theory: '<p>Свойство <code>color</code> меняет цвет <b>текста</b>, а <code>background</code> — цвет фона. Это разные свойства, их часто путают.</p>' +
        '<p>Цвет задают словом (<code>tomato</code>), шестнадцатеричным кодом (<code>#c0392b</code>) или функцией <code>rgb()</code>.</p>',
      prompt: 'Сделай абзац с классом <code>warn</code> и покрась его текст в красный цвет через CSS.',
      examples: [{ label: 'критерии', text: 'p.warn в HTML · в CSS у .warn есть color' }],
      hint: '.warn { color: #c0392b; }',
      starter: { html: '<p class="warn">Осторожно: файл будет перезаписан.</p>', css: '' },
      solution: {
        html: '<p class="warn">Осторожно: файл будет перезаписан.</p>\n<p>Обычный текст остаётся тёмным.</p>',
        css: '.warn { color: #c0392b; font-weight: bold; }'
      },
      checks: [
        { label: 'есть абзац с классом warn', fn: function (html) { return all(html, 'p.warn').length >= 1; } },
        { label: 'в CSS у .warn задан color', fn: function (html, css) { return cssHas(css, /\.warn\s*\{[^}]*color\s*:/); } }
      ]
    },
    {
      id: 'w17', level: 'легко',
      title: 'Фон страницы',
      subtitle: 'background',
      theory: '<p>Фон можно задать любому блоку, но чаще всего его задают <code>body</code> — тогда он растягивается на всю страницу.</p>' +
        '<p>Светлый фон и тёмный текст читаются легче, чем наоборот: контраст — это про удобство, а не про вкус.</p>',
      prompt: 'Задай странице светло-серый фон через <code>body</code> в CSS и оставь заголовок с абзацем.',
      examples: [{ label: 'критерии', text: 'в CSS body { background: … } · есть h1 и p' }],
      hint: 'body { background: #f4f6fb; }',
      starter: { html: '<h1>Мой дневник</h1>\n<p>Сегодня собрал первого робота.</p>', css: '' },
      solution: {
        html: '<h1>Мой дневник</h1>\n<p>Сегодня собрал первого робота.</p>',
        css: 'body { background: #f4f6fb; color: #1f2430; padding: 16px; }'
      },
      checks: [
        { label: 'есть заголовок и абзац', fn: function (html) { return all(html, 'h1').length >= 1 && all(html, 'p').length >= 1; } },
        { label: 'в CSS у body задан background', fn: function (html, css) { return cssHas(css, /body\s*\{[^}]*background\s*:/); } }
      ]
    },
    {
      id: 'w18', level: 'средне',
      title: 'Шрифт страницы',
      subtitle: 'font-family, font-size',
      theory: '<p><code>font-family</code> задаёт шрифт, а перечисление через запятую — запасные варианты: если первого шрифта нет, берётся следующий.</p>' +
        '<p>В конце всегда пишут семейство: <code>sans-serif</code> (без засечек) или <code>serif</code> (с засечками). Так текст всё равно останется читаемым.</p>',
      prompt: 'Задай <code>body</code> шрифт без засечек с запасным вариантом и размер 18px.',
      examples: [{ label: 'критерии', text: 'в CSS body { font-family: … , sans-serif; font-size: … }' }],
      hint: 'body { font-family: "Segoe UI", Arial, sans-serif; font-size: 18px; }',
      starter: { html: '<h1>Текст и шрифт</h1>\n<p>Читать длинный текст удобнее крупным шрифтом.</p>', css: '' },
      solution: {
        html: '<h1>Текст и шрифт</h1>\n<p>Читать длинный текст удобнее крупным шрифтом.</p>',
        css: 'body { font-family: "Segoe UI", Arial, sans-serif; font-size: 18px; line-height: 1.5; }'
      },
      checks: [
        { label: 'задан font-family с запасным sans-serif', fn: function (html, css) { return cssHas(css, /font-family\s*:[^;}]*sans-serif/); } },
        { label: 'задан font-size', fn: function (html, css) { return cssHas(css, /font-size\s*:/); } }
      ]
    },
    {
      id: 'w19', level: 'средне',
      title: 'Отступы внутри и снаружи',
      subtitle: 'padding и margin',
      theory: '<p><code>padding</code> — отступ <b>внутри</b> блока, между рамкой и текстом. <code>margin</code> — отступ <b>снаружи</b>, между блоками.</p>' +
        '<p>Если текст «прилип» к рамке — не хватает padding. Если блоки слиплись — не хватает margin.</p>',
      prompt: 'Сделай блок с заметкой: класс <code>note</code>, внутри отступ <code>padding</code>, снаружи <code>margin</code> и тонкая рамка.',
      examples: [{ label: 'критерии', text: 'div.note в HTML · в CSS у .note есть padding, margin и border' }],
      hint: '.note { padding: 12px; margin: 16px 0; border: 1px solid #ccc; }',
      starter: { html: '<div class="note">Проверка в пятницу.</div>', css: '' },
      solution: {
        html: '<div class="note">Проверка проекта в пятницу.</div>\n<p>Обычный абзац вне заметки.</p>',
        css: '.note { padding: 12px 16px; margin: 16px 0; border: 1px solid #c9d2e3; background: #f8fbff; }'
      },
      checks: [
        { label: 'есть блок с классом note', fn: function (html) { return all(html, 'div.note').length >= 1; } },
        { label: 'у .note есть padding', fn: function (html, css) { return cssHas(css, /\.note\s*\{[^}]*padding\s*:/); } },
        { label: 'у .note есть margin', fn: function (html, css) { return cssHas(css, /\.note\s*\{[^}]*margin\s*:/); } },
        { label: 'у .note есть border', fn: function (html, css) { return cssHas(css, /\.note\s*\{[^}]*border\s*:/); } }
      ]
    },
    {
      id: 'w20', level: 'сложно',
      title: 'Колонка по центру',
      subtitle: 'max-width и margin: auto',
      theory: '<p>Классический приём: <code>max-width</code> ограничивает ширину, а <code>margin: 0 auto</code> центрирует блок.</p>' +
        '<p>Так делают «читальную колонку»: на большом экране текст не растягивается на всю ширину и глаз не устаёт.</p>',
      prompt: 'Сделай <code>main</code> шириной не больше 640px, по центру экрана и с внутренними отступами.',
      examples: [{ label: 'критерии', text: 'в CSS main { max-width: 640px; margin: 0 auto; padding: … }' }],
      hint: 'main { max-width: 640px; margin: 0 auto; padding: 0 16px; }',
      starter: { html: '<main>\n  <h1>Статья</h1>\n  <p>Текст статьи.</p>\n</main>', css: 'main { }' },
      solution: {
        html: '<main>\n  <h1>Статья</h1>\n  <p>Длинный текст, который должен читаться в узкой колонке.</p>\n</main>',
        css: 'main { max-width: 640px; margin: 0 auto; padding: 0 16px; }'
      },
      checks: [
        { label: 'у main задан max-width', fn: function (html, css) { return cssHas(css, /main\s*\{[^}]*max-width\s*:/); } },
        { label: 'у main есть margin: auto (центрирование)', fn: function (html, css) { return cssHas(css, /main\s*\{[^}]*margin\s*:[^;}]*auto/); } },
        { label: 'у main есть padding', fn: function (html, css) { return cssHas(css, /main\s*\{[^}]*padding\s*:/); } }
      ]
    },
    {
      id: 'w21', level: 'средне',
      title: 'Ссылка без подчёркивания',
      subtitle: 'a и text-decoration',
      theory: '<p>Ссылки подчёркнуты по умолчанию — так их видно. Убирать подчёркивание можно, но тогда нужно дать другой признак: цвет, жирность, фон.</p>' +
        '<p>Кнопка-ссылка делается так же: <code>a</code> со стилями <code>padding</code>, <code>background</code> и <code>border-radius</code>.</p>',
      prompt: 'Сделай ссылку-кнопку с классом <code>btn</code>: без подчёркивания, с фоном и внутренними отступами.',
      examples: [{ label: 'критерии', text: 'a.btn в HTML · у .btn есть text-decoration: none, background, padding' }],
      hint: '.btn { text-decoration: none; background: #2d6cdf; color: #fff; padding: 8px 14px; border-radius: 6px; }',
      starter: { html: '<a class="btn" href="mailto:info@kvantum.ru">Написать</a>', css: '' },
      solution: {
        html: '<p>Есть вопросы?</p>\n<a class="btn" href="mailto:info@kvantum.ru">Написать нам</a>',
        css: '.btn { text-decoration: none; background: #2d6cdf; color: #fff; padding: 8px 14px; border-radius: 6px; display: inline-block; }'
      },
      checks: [
        { label: 'есть ссылка с классом btn', fn: function (html) { return all(html, 'a.btn').length >= 1; } },
        { label: 'у .btn убрано подчёркивание', fn: function (html, css) { return cssHas(css, /\.btn\s*\{[^}]*text-decoration\s*:\s*none/); } },
        { label: 'у .btn есть фон и padding', fn: function (html, css) { return cssHas(css, /\.btn\s*\{[^}]*background\s*:/) && cssHas(css, /\.btn\s*\{[^}]*padding\s*:/); } }
      ]
    },
    {
      id: 'w22', level: 'сложно',
      title: 'Стилизация по id',
      subtitle: '#id и приоритеты',
      theory: '<p>Кроме тегов и классов селектором бывает <code>id</code>: <code>#hero</code>. Класс можно повторять, id — только один на странице.</p>' +
        '<p>Приоритет: стиль по id сильнее стиля по классу, а класс сильнее тега. Поэтому id используют редко — с ним трудно переопределять стили.</p>',
      prompt: 'Сделай блок с <code>id="hero"</code> и задай ему в CSS высоту не меньше 200px, фон и выравнивание текста по центру.',
      examples: [{ label: 'критерии', text: 'есть #hero · в CSS #hero { min-height/height, background, text-align: center }' }],
      hint: '#hero { min-height: 200px; background: #dbeafe; text-align: center; }',
      starter: { html: '<div id="hero"><h1>Квантум</h1></div>', css: '' },
      solution: {
        html: '<div id="hero">\n  <h1>Квантум</h1>\n  <p>Тренажёры для школьников.</p>\n</div>',
        css: '#hero { min-height: 200px; background: #dbeafe; text-align: center; padding: 24px; }'
      },
      checks: [
        { label: 'есть блок с id="hero"', fn: function (html) { return all(html, '#hero').length === 1; } },
        { label: 'в CSS задана высота блока', fn: function (html, css) { return cssHas(css, /#hero\s*\{[^}]*(min-height|height)\s*:/); } },
        { label: 'в CSS задан фон', fn: function (html, css) { return cssHas(css, /#hero\s*\{[^}]*background\s*:/); } },
        { label: 'текст выровнен по центру', fn: function (html, css) { return cssHas(css, /#hero\s*\{[^}]*text-align\s*:\s*center/); } }
      ]
    }
  ];

  global.WEB_TASKS = (global.WEB_TASKS || []).concat(bank);
})(typeof window !== 'undefined' ? window : globalThis);
