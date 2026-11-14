/* ==========================================================================
   Веб-студия — задачи. Проверка смотрит на готовую страницу: разбирается HTML
   и правила CSS, а не текст программы.
   ========================================================================== */
(function (global) {
  'use strict';

  function parse(html) {
    return new DOMParser().parseFromString('<div id="__root">' + html + '</div>', 'text/html');
  }
  function root(html) { return parse(html).getElementById('__root'); }
  function all(html, sel) { return Array.prototype.slice.call(root(html).querySelectorAll(sel)); }
  function cssHas(css, re) { return re.test(String(css).replace(/\s+/g, ' ').toLowerCase()); }

  global.WEB_TASKS = [
    {
      id: 'w1',
      level: 'легко',
      title: 'Заголовок и абзац',
      subtitle: 'h1, p, структура документа',
      theory: '<p>Страница — это дерево тегов. <code>&lt;h1&gt;</code> — главный заголовок, <code>&lt;p&gt;</code> — абзац. ' +
              'Браузер сам расставляет размеры и отступы, если не вмешиваться.</p>' +
              '<p>Пиши теги закрытыми: <code>&lt;p&gt;текст&lt;/p&gt;</code>.</p>',
      prompt: 'Сделай страницу с заголовком <code>Мой первый сайт</code> и абзацем текста в два предложения.',
      examples: [{ label: 'критерии', text: 'есть один h1 с нужным текстом · есть p длиной больше 20 символов' }],
      hint: '<h1>Мой первый сайт</h1>\n<p>Это мой первый абзац. Здесь два предложения.</p>',
      solution: { html: '<h1>Мой первый сайт</h1>\n<p>Я учусь делать сайты. Это мой первый абзац.</p>', css: '' },
      checks: [
        {
          label: 'есть ровно один заголовок h1',
          fn: function (html) { return all(html, 'h1').length === 1; }
        },
        {
          label: 'h1 содержит текст «Мой первый сайт»',
          fn: function (html) {
            var h = all(html, 'h1')[0];
            return !!h && h.textContent.trim().toLowerCase() === 'мой первый сайт';
          }
        },
        {
          label: 'есть абзац p длиннее 20 символов',
          fn: function (html) { return all(html, 'p').some(function (p) { return p.textContent.trim().length > 20; }); }
        }
      ]
    },
    {
      id: 'w2',
      level: 'легко',
      title: 'Список',
      subtitle: 'ul, li — перечисления',
      theory: '<p><code>&lt;ul&gt;</code> — маркированный список, внутри только <code>&lt;li&gt;</code>. ' +
              'Нумерованный — <code>&lt;ol&gt;</code>.</p>' +
              '<p>Списки — семантика: скринридеры и поисковики понимают, что это перечисление.</p>',
      prompt: 'Сделай маркированный список из трёх предметов: Python, сети, веб.',
      examples: [{ label: 'критерии', text: 'один ul · ровно три li · тексты «Python», «сети», «веб»' }],
      hint: '<ul>\n  <li>Python</li>\n  <li>сети</li>\n  <li>веб</li>\n</ul>',
      solution: { html: '<ul>\n  <li>Python</li>\n  <li>сети</li>\n  <li>веб</li>\n</ul>', css: '' },
      checks: [
        { label: 'есть список ul', fn: function (html) { return all(html, 'ul').length >= 1; } },
        { label: 'в нём ровно три пункта li', fn: function (html) { return all(html, 'ul li').length === 3; } },
        {
          label: 'пункты — Python, сети, веб',
          fn: function (html) {
            var texts = all(html, 'ul li').map(function (li) { return li.textContent.trim().toLowerCase(); });
            return ['python', 'сети', 'веб'].every(function (w) { return texts.indexOf(w) >= 0; });
          }
        }
      ]
    },
    {
      id: 'w3',
      level: 'средне',
      title: 'Ссылка и картинка',
      subtitle: 'a href, img alt, доступность',
      theory: '<p><code>&lt;a href="адрес"&gt;</code> — ссылка. <code>&lt;img src="..." alt="описание"&gt;</code> — картинка.</p>' +
              '<p><code>alt</code> — не формальность: без него страница недоступна для незрячих и плохо индексируется. ' +
              'Это первое, что проверяют на ревью.</p>',
      prompt: 'Добавь на страницу ссылку на <code>https://developer.mozilla.org</code> с текстом <code>Документация</code> ' +
              'и картинку с непустым <code>alt</code> (адрес картинки любой).',
      examples: [{ label: 'критерии', text: 'a с href и текстом · img с alt (не пустым)' }],
      hint: '<a href="https://developer.mozilla.org">Документация</a>\n<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3MiIgaGVpZ2h0PSI3MiI+PHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiByeD0iMTAiIGZpbGw9IiNmMDg4M2UiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjMwIiByPSI2IiBmaWxsPSIjMGQxMTE3Ii8+PGNpcmNsZSBjeD0iNDgiIGN5PSIzMCIgcj0iNiIgZmlsbD0iIzBkMTExNyIvPjxwYXRoIGQ9Ik0yMiA0OCBxMTQgMTAgMjggMCIgc3Ryb2tlPSIjMGQxMTE3IiBzdHJva2Utd2lkdGg9IjQiIGZpbGw9Im5vbmUiLz48L3N2Zz4=" alt="кот в коробке">',
      solution: {
        html: '<a href="https://developer.mozilla.org">Документация</a>\n<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3MiIgaGVpZ2h0PSI3MiI+PHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiByeD0iMTAiIGZpbGw9IiNmMDg4M2UiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjMwIiByPSI2IiBmaWxsPSIjMGQxMTE3Ii8+PGNpcmNsZSBjeD0iNDgiIGN5PSIzMCIgcj0iNiIgZmlsbD0iIzBkMTExNyIvPjxwYXRoIGQ9Ik0yMiA0OCBxMTQgMTAgMjggMCIgc3Ryb2tlPSIjMGQxMTE3IiBzdHJva2Utd2lkdGg9IjQiIGZpbGw9Im5vbmUiLz48L3N2Zz4=" alt="кот в коробке">',
        css: ''
      },
      checks: [
        {
          label: 'ссылка ведёт на developer.mozilla.org',
          fn: function (html) {
            return all(html, 'a').some(function (a) { return (a.getAttribute('href') || '').indexOf('developer.mozilla.org') >= 0; });
          }
        },
        {
          label: 'текст ссылки — «Документация»',
          fn: function (html) {
            return all(html, 'a').some(function (a) { return a.textContent.trim().toLowerCase() === 'документация'; });
          }
        },
        {
          label: 'у картинки есть непустой alt',
          fn: function (html) {
            return all(html, 'img').some(function (i) { return (i.getAttribute('alt') || '').trim().length > 3; });
          }
        }
      ]
    },
    {
      id: 'w4',
      level: 'средне',
      title: 'Первые стили',
      subtitle: 'CSS: селектор, свойство, значение',
      theory: '<p>CSS-правило состоит из селектора и блока свойств: <code>body { color: #111; }</code>.</p>' +
              '<p>Цвет текста — <code>color</code>, фон — <code>background-color</code>, размер шрифта — <code>font-size</code>. ' +
              'Значения: цвета можно словами (<code>navy</code>) или кодом (<code>#1d3557</code>).</p>',
      prompt: 'Оформи страницу: у <code>body</code> должен быть фон (не белый) и тёмный цвет текста, ' +
              'а у <code>h1</code> — размер шрифта больше 30px.',
      examples: [{ label: 'критерии', text: 'body { background-color … } · body { color … } · h1 { font-size: 31px+ }' }],
      hint: 'body { background-color: #f2f6ff; color: #10202f; }\nh1 { font-size: 36px; }',
      solution: {
        html: '<h1>Мой первый сайт</h1>\n<p>Со стилями страница выглядит иначе.</p>',
        css: 'body { background-color: #f2f6ff; color: #10202f; }\nh1 { font-size: 36px; }'
      },
      checks: [
        {
          label: 'у body задан background-color',
          fn: function (html, css) { return cssHas(css, /body\s*\{[^}]*background(-color)?\s*:/); }
        },
        {
          label: 'у body задан цвет текста',
          fn: function (html, css) { return cssHas(css, /body\s*\{[^}]*[^-]color\s*:/); }
        },
        {
          label: 'у h1 размер шрифта больше 30px',
          fn: function (html, css) {
            var m = /h1\s*\{[^}]*font-size\s*:\s*([\d.]+)\s*(px|rem|em)/i.exec(String(css));
            if (!m) return false;
            var v = parseFloat(m[1]);
            if (m[2].toLowerCase() !== 'px') v = v * 16;
            return v > 30;
          }
        }
      ]
    },
    {
      id: 'w5',
      level: 'средне',
      title: 'Класс и карточка',
      subtitle: 'class, border-radius, padding',
      theory: '<p>Класс — способ пометить группу элементов: в HTML <code>class="card"</code>, в CSS селектор <code>.card</code>.</p>' +
              '<p>Карточка обычно требует отступов внутри (<code>padding</code>), рамки (<code>border</code>) ' +
              'и скругления (<code>border-radius</code>).</p>',
      prompt: 'Сделай блок <code>&lt;div class="card"&gt;</code> с текстом и оформи класс <code>.card</code>: ' +
              'внутренние отступы не меньше 12px, скругление не меньше 8px и рамка.',
      examples: [{ label: 'критерии', text: 'div.card на странице · .card { padding ≥ 12px; border-radius ≥ 8px; border }' }],
      hint: '<div class="card">Привет!</div>\n.card { padding: 16px; border-radius: 12px; border: 1px solid #ccc; }',
      solution: {
        html: '<div class="card">Это карточка с текстом.</div>',
        css: '.card { padding: 16px; border-radius: 12px; border: 1px solid #c9d4e6; background: #fff; }'
      },
      checks: [
        {
          label: 'на странице есть элемент с классом card',
          fn: function (html) { return all(html, '.card').length >= 1; }
        },
        {
          label: 'padding не меньше 12px',
          fn: function (html, css) {
            var m = /\.card\s*\{[^}]*padding\s*:\s*([\d.]+)px/i.exec(String(css));
            return !!m && parseFloat(m[1]) >= 12;
          }
        },
        {
          label: 'border-radius не меньше 8px',
          fn: function (html, css) {
            var m = /\.card\s*\{[^}]*border-radius\s*:\s*([\d.]+)px/i.exec(String(css));
            return !!m && parseFloat(m[1]) >= 8;
          }
        },
        {
          label: 'есть рамка border',
          fn: function (html, css) { return cssHas(css, /\.card\s*\{[^}]*border\s*:/); }
        }
      ]
    },
    {
      id: 'w6',
      level: 'сложно',
      title: 'Флексбокс и адаптивность',
      subtitle: 'display: flex, gap, @media',
      theory: '<p><code>display: flex</code> выстраивает детей контейнера в строку. <code>gap</code> задаёт промежутки ' +
              'без хитростей с полями.</p>' +
              '<p><code>@media (max-width: 600px)</code> включает правила только на узком экране — так страница ' +
              'становится удобной на телефоне.</p>',
      prompt: 'Сделай контейнер <code>&lt;div class="row"&gt;</code> с тремя блоками и оформи: ' +
              '<code>.row</code> — флекс с зазором, а внутри <code>@media (max-width: 600px)</code> — ' +
              'переключение на колонку (<code>flex-direction: column</code>).',
      examples: [{ label: 'критерии', text: '.row { display:flex; gap } · @media с flex-direction: column' }],
      hint: '.row { display: flex; gap: 12px; }\n@media (max-width: 600px) { .row { flex-direction: column; } }',
      solution: {
        html: '<div class="row"><div>A</div><div>B</div><div>C</div></div>',
        css: '.row { display: flex; gap: 12px; }\n.row > div { padding: 10px; border: 1px solid #ccc; border-radius: 8px; }\n' +
             '@media (max-width: 600px) { .row { flex-direction: column; } }'
      },
      checks: [
        {
          label: 'есть контейнер .row с тремя дочерними блоками',
          fn: function (html) {
            var r = all(html, '.row')[0];
            return !!r && r.children.length >= 3;
          }
        },
        {
          label: 'у .row display: flex и задан gap',
          fn: function (html, css) {
            return cssHas(css, /\.row\s*\{[^}]*display\s*:\s*flex/) && cssHas(css, /\.row\s*\{[^}]*gap\s*:/);
          }
        },
        {
          label: 'есть @media (max-width …) с flex-direction: column',
          fn: function (html, css) {
            return /@media[^{]*max-width[^{]*\{[\s\S]*flex-direction\s*:\s*column/i.test(String(css));
          }
        }
      ]
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
