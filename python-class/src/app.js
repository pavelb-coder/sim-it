/* ==========================================================================
   Приложение «Python-класс» для IT-квантума.
   Логика: список задач с прогрессом, редактор с подсветкой, запуск,
   автопроверка по скрытым тестам, пошаговый трейс переменных.
   ========================================================================== */
(function () {
  'use strict';

  var TASKS = window.PYTASKS || [];
  var Py = window.PyTrainer;
  var STORE_KEY = 'pyclass.v1';

  var state = {
    solved: {},          // id задачи -> true
    code: {},            // id задачи -> текст
    showAll: false,
    current: 0,
    tab: 'out',
    lastRun: null,
    lastCheck: null,
    traceSel: 0
  };

  /* ------------------------------ утилиты ------------------------------ */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function normOut(s) {
    return String(s == null ? '' : s)
      .replace(/\r\n?/g, '\n')
      .split('\n').map(function (l) { return l.replace(/[ \t]+$/, ''); }).join('\n')
      .replace(/\n+$/, '').trim();
  }
  function stdinLines(text) {
    if (text == null || text === '') return [];
    return String(text).replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ solved: state.solved, code: state.code, showAll: state.showAll })); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      state.solved = d.solved || {};
      state.code = d.code || {};
      state.showAll = !!d.showAll;
    } catch (e) {}
  }
  function unlocked(i) {
    if (state.showAll) return true;
    if (i === 0) return true;
    return !!state.solved[TASKS[i - 1].id];
  }
  function solvedCount() {
    var n = 0;
    for (var i = 0; i < TASKS.length; i++) if (state.solved[TASKS[i].id]) n++;
    return n;
  }

  /* --------------------------- подсветка кода --------------------------- */
  var KW = /\b(def|return|if|elif|else|while|for|in|and|or|not|break|continue|pass|import|from|as|global|None|True|False)\b/;
  var RE_TOK = new RegExp(
    '(#[^\\n]*)' +                                        // 1 комментарий
    '|("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')' + // 2 строка
    '|(\\b(?:def|return|if|elif|else|while|for|in|and|or|not|break|continue|pass|import|from|as|global|None|True|False)\\b)' + // 3 ключевые
    '|(\\b(?:print|input|int|float|str|len|range|sum|sorted|max|min|abs|round|list|dict|enumerate|type|bool|reversed|zip)\\b)' + // 4 встроенные
    '|(\\b\\d+\\.?\\d*\\b)',                              // 5 числа
    'g'
  );

  function highlight(code) {
    var out = '', last = 0, m;
    RE_TOK.lastIndex = 0;
    var src = String(code);
    while ((m = RE_TOK.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      var cls = m[1] ? 'tok-com' : m[2] ? 'tok-str' : m[3] ? 'tok-kw' : m[4] ? 'tok-bi' : 'tok-num';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    out += esc(src.slice(last));
    return out + '\n';
  }

  /* ------------------------------ редактор ------------------------------ */
  var ta = $('code'), hl = $('codeHl'), gutter = $('gutter');

  function currentTask() { return TASKS[state.current]; }

  function syncEditor() {
    var code = ta.value;
    hl.innerHTML = highlight(code);
    var lines = code.split('\n').length;
    var nums = '';
    for (var i = 1; i <= lines; i++) nums += i + '\n';
    gutter.textContent = nums;
    var t = currentTask();
    if (t && state.code[t.id] !== code) { state.code[t.id] = code; save(); }
  }

  function setEditor(text) {
    ta.value = text;
    syncEditor();
    ta.scrollTop = 0; hl.scrollTop = 0; gutter.scrollTop = 0;
  }

  function applyIndent(e) {
    var key = e.key;
    if (key === 'Tab') {
      e.preventDefault();
      var s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 4;
      syncEditor();
      return;
    }
    if (key === 'Enter') {
      var pos = ta.selectionStart;
      var before = ta.value.slice(0, pos);
      var lineStart = before.lastIndexOf('\n') + 1;
      var line = before.slice(lineStart);
      var indent = (line.match(/^[ \t]*/) || [''])[0];
      var extra = /:\s*$/.test(line) ? '    ' : '';
      if (indent || extra) {
        e.preventDefault();
        var ins = '\n' + indent + extra;
        ta.value = ta.value.slice(0, pos) + ins + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = pos + ins.length;
        syncEditor();
      }
    }
  }

  ta.addEventListener('input', syncEditor);
  ta.addEventListener('keydown', applyIndent);
  ta.addEventListener('scroll', function () {
    hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft;
    gutter.scrollTop = ta.scrollTop;
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) doCheck(); else doRun();
    }
  });

  /* ------------------------------- запуск ------------------------------- */
  function switchTab(name) {
    state.tab = name;
    ['out', 'check', 'vars'].forEach(function (t) {
      $('tab-' + t).classList.toggle('active', t === name);
      $('panel-' + t).hidden = (t !== name);
    });
  }

  function doRun() {
    var t = currentTask();
    var res = Py.run(ta.value, { stdin: stdinLines($('stdin').value), trace: true });
    state.lastRun = res;
    var html = '';
    if (res.output) html += '<pre class="out">' + esc(res.output) + '</pre>';
    else if (res.ok) html += '<pre class="out empty">Программа ничего не вывела. Добавь print().</pre>';
    if (res.error) {
      html += '<div class="err"><b>' + esc(res.error.kind || 'Ошибка') + '</b>' +
        (res.error.line ? ' (строка ' + res.error.line + ')' : '') + ': ' + esc(res.error.msg) + '</div>';
    }
    $('panel-out').innerHTML = html || '<pre class="out empty">Пока пусто — нажми «Запустить».</pre>';
    renderTrace(res.trace);
    switchTab('out');
  }

  function doCheck() {
    var t = currentTask();
    var code = ta.value;
    // отдельный прогон первого теста с трейсом — чтобы вкладка «Переменные» была полезна и после проверки
    state.lastRun = Py.run(code, { stdin: stdinLines(t.tests[0].stdin), trace: true });
    var results = t.tests.map(function (test) {
      var r = Py.run(code, { stdin: stdinLines(test.stdin) });
      var got = r.ok ? r.output : null;
      return {
        ok: r.ok && normOut(got) === normOut(test.expected),
        got: got,
        want: test.expected,
        stdin: test.stdin,
        error: r.error
      };
    });
    var passed = results.filter(function (r) { return r.ok; }).length;
    var allOk = passed === results.length;
    state.lastCheck = { results: results, passed: passed, allOk: allOk };

    var html = '';
    if (allOk) {
      html += '<div class="summary good">✔ Все тесты пройдены: ' + passed + ' из ' + results.length + '.</div>';
    } else {
      html += '<div class="summary bad">Пройдено ' + passed + ' из ' + results.length + ' тестов. ' +
        'Ошибки видны ниже — это и есть подсказка, что именно не так.</div>';
    }
    results.forEach(function (r, i) {
      html += '<div class="test-row ' + (r.ok ? 'pass' : 'fail') + '">' +
        '<span class="mark">' + (r.ok ? '✔' : '✕') + '</span><div class="io">' +
        '<div><span class="k">тест ' + (i + 1) + ', ввод:</span> ' + (r.stdin === '' ? '(пусто)' : esc(r.stdin.replace(/\n/g, ' ⏎ '))) + '</div>';
      if (!r.ok) {
        if (r.error) {
          html += '<div class="bad">' + esc(r.error.kind) + (r.error.line ? ' (строка ' + r.error.line + ')' : '') +
            ': ' + esc(r.error.msg) + '</div>';
        } else {
          html += '<div><span class="k">ожидалось:</span> <span class="good">' + esc(r.want.replace(/\n/g, ' ⏎ ')) + '</span></div>';
          html += '<div><span class="k">получено:</span> <span class="bad">' + esc(normOut(r.got).replace(/\n/g, ' ⏎ ') || '(пусто)') + '</span></div>';
        }
      }
      html += '</div></div>';
    });

    if (allOk) {
      html += '<div class="celebrate">Задача закрыта — прогресс сохранён.' + markSolved(t.id) + '</div>';
      html += '<div class="solution"><div class="lbl">Эталонное решение — сравни со своим</div><pre>' + esc(t.solution) + '</pre></div>';
    }

    $('panel-check').innerHTML = html;
    renderTrace(state.lastRun ? state.lastRun.trace : []);
    switchTab('check');
    renderSidebar();
    renderProgress();
  }

  function markSolved(id) {
    if (state.solved[id]) return '';
    state.solved[id] = true;
    var nextIdx = state.current + 1;
    save();
    if (nextIdx < TASKS.length) {
      return '<br><button class="btn ok" id="goNext">Следующая задача →</button>';
    }
    return '<br><b>Это была последняя задача модуля. Модуль 1 пройден целиком.</b>';
  }

  /* ------------------------------- трейс ------------------------------- */
  function renderTrace(trace) {
    var panel = $('panel-vars');
    if (!trace || !trace.length) {
      panel.innerHTML = '<pre class="out empty">Трейс появится после запуска: он показывает, как менялись переменные на каждом шаге — ' +
        'это наш «осциллограф».</pre>';
      return;
    }
    var lines = ta.value.split('\n');
    var html = '<div style="font-size:12px;color:#8b97ad;margin-bottom:8px">' +
      'Шагов: ' + trace.length + '. Нажми на строку, чтобы увидеть состояние переменных.</div>';
    var shown = trace.slice(0, 200);
    shown.forEach(function (st, i) {
      var codeLine = (lines[st.line - 1] || '').trim();
      var vars = Object.keys(st.vars);
      var varsHtml = vars.length
        ? vars.map(function (k) { return esc(k) + ' = ' + esc(st.vars[k]); }).join('   ')
        : '<span class="none">переменных пока нет</span>';
      html += '<div class="trace-row" data-i="' + i + '">' +
        '<div class="trace-line">' + st.line + '</div>' +
        '<div class="trace-body"><div class="trace-code">' + esc(codeLine) + '</div>' +
        '<div class="trace-vars">' + varsHtml + '</div></div></div>';
    });
    if (trace.length > 200) {
      html += '<div style="font-size:12px;color:#5f6b80;margin-top:8px">Показаны первые 200 шагов из ' + trace.length + '.</div>';
    }
    panel.innerHTML = html;
    Array.prototype.forEach.call(panel.querySelectorAll('.trace-row'), function (row) {
      row.addEventListener('click', function () {
        Array.prototype.forEach.call(panel.querySelectorAll('.trace-row'), function (r) { r.classList.remove('sel'); });
        row.classList.add('sel');
      });
    });
  }

  /* ------------------------------ отрисовка ------------------------------ */
  function renderSidebar() {
    var list = $('taskList');
    var html = '';
    TASKS.forEach(function (t, i) {
      var done = !!state.solved[t.id];
      var lock = !unlocked(i);
      html += '<button class="task-item' + (i === state.current ? ' active' : '') + (done ? ' done' : '') +
        (lock ? ' locked' : '') + '" data-i="' + i + '">' +
        '<span class="num">' + (done ? '✓' : (lock ? '🔒' : (i + 1))) + '</span>' +
        '<span class="t-main"><span class="t-title">' + esc(t.title) + '</span>' +
        '<span class="t-sub">' + esc(t.subtitle) + '</span></span></button>';
    });
    list.innerHTML = html;
    Array.prototype.forEach.call(list.querySelectorAll('.task-item'), function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-i'), 10);
        if (!unlocked(i)) return;
        openTask(i);
      });
    });
  }

  function renderProgress() {
    var n = solvedCount();
    $('progressBar').style.width = (n / TASKS.length * 100) + '%';
    $('progressText').innerHTML = '<b>' + n + '</b> из ' + TASKS.length + ' задач';
  }

  function openTask(i) {
    state.current = i;
    state.lastRun = null;
    var t = TASKS[i];
    $('taskTitle').textContent = t.title;
    $('taskSub').textContent = t.subtitle;
    $('theory').innerHTML = t.theory;
    $('prompt').innerHTML = t.prompt;
    var ex = '';
    t.examples.forEach(function (e) {
      ex += '<div class="example">' +
        '<div class="lbl">ввод</div><pre>' + esc(e.inp || '(пусто)') + '</pre>' +
        '<div class="arrow">\u2193 вывод</div>' +
        '<pre>' + esc(e.out) + '</pre></div>';
    });
    $('examples').innerHTML = ex;
    $('hintBox').textContent = t.hint;
    $('hintBox').classList.remove('show');
    setEditor(state.code[t.id] != null ? state.code[t.id] : t.starter);
    $('stdin').value = t.examples[0] ? t.examples[0].inp : '';
    $('panel-out').innerHTML = '<pre class="out empty">Нажми «Запустить» (Ctrl+Enter) — вывод появится здесь.</pre>';
    $('panel-check').innerHTML = '<pre class="out empty">Нажми «Проверить» (Ctrl+Shift+Enter) — программа прогонится по скрытым тестам.</pre>';
    renderTrace([]);
    renderSidebar();
    renderProgress();
    switchTab('out');
    if (window.innerWidth < 880) $('taskList').scrollLeft = 0;
  }

  /* ------------------------------- кнопки ------------------------------- */
  $('btnRun').addEventListener('click', doRun);
  $('btnCheck').addEventListener('click', doCheck);
  $('btnHint').addEventListener('click', function () { $('hintBox').classList.toggle('show'); });
  $('btnReset').addEventListener('click', function () {
    var t = currentTask();
    if (!confirm('Вернуть исходный код задачи? Твои изменения будут потеряны.')) return;
    state.code[t.id] = t.starter;
    setEditor(t.starter);
  });
  $('btnShowAll').addEventListener('click', function () {
    state.showAll = !state.showAll;
    save();
    $('btnShowAll').textContent = state.showAll ? 'Обычный режим' : 'Открыть все задачи';
    renderSidebar();
  });
  $('btnResetProgress').addEventListener('click', function () {
    if (!confirm('Сбросить весь прогресс и код всех задач?')) return;
    state.solved = {}; state.code = {}; state.showAll = false;
    save();
    $('btnShowAll').textContent = 'Открыть все задачи';
    openTask(0);
  });
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'goNext') openTask(Math.min(state.current + 1, TASKS.length - 1));
  });

  ['out', 'check', 'vars'].forEach(function (t) {
    $('tab-' + t).addEventListener('click', function () { switchTab(t); });
  });

  /* -------------------------------- старт -------------------------------- */
  load();
  $('btnShowAll').textContent = state.showAll ? 'Обычный режим' : 'Открыть все задачи';
  var firstUnsolved = 0;
  for (var i = 0; i < TASKS.length; i++) { if (!state.solved[TASKS[i].id]) { firstUnsolved = i; break; } }
  openTask(unlocked(firstUnsolved) ? firstUnsolved : 0);
  $('engineBadge').textContent = 'движок: встроенный · офлайн · без Pyodide';
  window.__app = { state: state, doRun: doRun, doCheck: doCheck, openTask: openTask };
})();
