/* ==========================================================================
   C++-класс: редактор, запуск через мини-компилятор, проверка по тестам.
   ========================================================================== */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function normalize(s) {
    return String(s == null ? '' : s).replace(/\r/g, '').split('\n')
      .map(function (l) { return l.replace(/[ \t]+$/g, ''); }).join('\n').replace(/\n+$/, '');
  }
  function short(s, n) {
    s = String(s == null ? '' : s).replace(/\n/g, ' ⏎ ');
    n = n || 34;
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
  function srcLine(src, n) {
    var lines = String(src).split('\n');
    return lines[n - 1] === undefined ? '' : lines[n - 1];
  }

  var draftTimer = null;
  var currentTask = null;

  function draftKey(id) { return 'cpp.draft.' + id; }

  function saveDraft() {
    if (!currentTask) return;
    try { localStorage.setItem(draftKey(currentTask.id), $('cppCode').value); } catch (e) {}
  }

  function renderRun(res, src) {
    var outBox = $('cppOut'), errBox = $('cppErr');
    outBox.textContent = res.output || '';
    if (res.compileError) {
      errBox.innerHTML = '<div class="cpp-err-head">✖ Ошибка компиляции — строка ' + res.compileError.line + '</div>' +
        '<div class="cpp-err-msg">' + esc(res.compileError.message) + '</div>' +
        '<pre class="cpp-err-code">' + res.compileError.line + ' | ' + esc(srcLine(src, res.compileError.line)) + '</pre>' +
        '<div class="cpp-err-hint">Компилятор не пропустил программу: она не запускалась.</div>';
    } else if (res.runtimeError) {
      errBox.innerHTML = '<div class="cpp-err-head">✖ Ошибка во время выполнения' + (res.runtimeError.line ? ' — строка ' + res.runtimeError.line : '') + '</div>' +
        '<div class="cpp-err-msg">' + esc(res.runtimeError.message) + '</div>' +
        (res.runtimeError.line ? '<pre class="cpp-err-code">' + res.runtimeError.line + ' | ' + esc(srcLine(src, res.runtimeError.line)) + '</pre>' : '') +
        '<div class="cpp-err-hint">Программа собралась, но упала на этих данных.' + (res.output ? ' Вывод до падения: ' + esc(short(res.output, 60)) : '') + '</div>';
    } else {
      errBox.innerHTML = '<div class="cpp-ok">✔ собрано и выполнено без ошибок</div>';
    }
  }

  function runCurrent() {
    var src = $('cppCode').value;
    var res = window.CppEngine.run(src, $('cppStdin').value);
    renderRun(res, src);
    return res;
  }

  function setCode(text) { $('cppCode').value = text; saveDraftNow(); }
  function saveDraftNow() {
    if (!currentTask) return;
    try { localStorage.setItem(draftKey(currentTask.id), $('cppCode').value); } catch (e) {}
  }

  window.CPPAPI = { run: function (src, stdin) { return window.CppEngine.run(src, stdin); } };

  document.addEventListener('DOMContentLoaded', function () {
    $('btnRun').addEventListener('click', runCurrent);
    $('btnClearOut').addEventListener('click', function () {
      $('cppOut').textContent = '';
      $('cppErr').innerHTML = '';
    });
    $('btnResetCode').addEventListener('click', function () {
      if (!currentTask) return;
      $('cppCode').value = currentTask.starter;
      saveDraftNow();
      $('cppOut').textContent = '';
      $('cppErr').innerHTML = '';
    });
    $('cppCode').addEventListener('input', function () {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(saveDraft, 400);
    });
    $('cppCode').addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var el = e.target, start = el.selectionStart, end = el.selectionEnd;
        el.value = el.value.slice(0, start) + '    ' + el.value.slice(end);
        el.selectionStart = el.selectionEnd = start + 4;
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCurrent();
      }
    });

    window.Shell.init({
      storageKey: 'cpp.v1',
      productTitle: 'C++-класс',
      productSubtitle: 'компилятор в браузере',
      tasks: window.CPP_TASKS,
      open: function (task) {
        currentTask = task;
        var draft = null;
        try { draft = localStorage.getItem(draftKey(task.id)); } catch (e) {}
        $('cppCode').value = draft !== null ? draft : task.starter;
        $('cppStdin').value = (task.tests[0] && task.tests[0].input) || '';
        $('cppOut').textContent = '';
        $('cppErr').innerHTML = '';
      },
      check: function (task) {
        var src = $('cppCode').value;
        var fails = [];
        var anyError = null;
        var results = task.tests.map(function (tc, i) {
          var res = window.CppEngine.run(src, tc.input);
          var err = res.compileError || res.runtimeError;
          if (err && !anyError) anyError = res.compileError ? 'компиляция: ' + err.message + ' (строка ' + err.line + ')' : 'выполнение: ' + err.message;
          var got = err ? null : normalize(res.output);
          var want = normalize(tc.expected);
          var ok = got !== null && got === want;
          return { ok: ok, tc: tc, got: got, err: err, res: res };
        });

        // показать в консоли прогон первого теста
        var first = results[0];
        if (first) {
          var shown = window.CppEngine.run(src, first.tc.input);
          renderRun(shown, src);
        }

        var out = [];
        out.push({
          ok: !anyError,
          label: 'программа компилируется и запускается',
          note: anyError || ''
        });
        results.forEach(function (r, i) {
          var label = 'тест ' + (i + 1) + ': ввод «' + short(r.tc.input || 'пусто', 18) + '» → вывод «' + short(normalize(r.tc.expected), 26) + '»';
          out.push({
            ok: r.ok,
            label: label,
            note: r.err ? (r.err.message + ' (строка ' + r.err.line + ')') : (r.ok ? '' : 'получено: «' + short(r.got, 40) + '»')
          });
        });
        return out;
      }
    });

    window.__solve = function (i) {
      var task = window.CPP_TASKS[i];
      currentTask = task;
      $('cppCode').value = task.solution;
      saveDraftNow();
      $('cppStdin').value = (task.tests[0] && task.tests[0].input) || '';
      runCurrent();
    };
  });
})();
