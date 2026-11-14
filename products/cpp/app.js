/* ==========================================================================
   C++-класс: редактор, запуск, тесты, прогресс. Движок — CppEngine (engine.js).
   ========================================================================== */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var current = null;

  /* --------- нормализация вывода: пробелы в конце строк и пустые строки в конце не считаем --------- */
  function normalize(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').map(function (l) {
      return l.replace(/[ \t]+$/, '');
    });
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  }

  function renderGutter() {
    var lines = $('cppCode').value.split('\n').length;
    var nums = [];
    for (var i = 1; i <= Math.max(lines, 1); i++) nums.push(i);
    $('cppGutter').innerHTML = nums.join('<br>');
    $('cppGutter').scrollTop = $('cppCode').scrollTop;
  }

  function showError(err, line) {
    var box = $('cppErr');
    if (!err) { box.style.display = 'none'; box.textContent = ''; return; }
    box.style.display = '';
    box.textContent = (line ? 'строка ' + line + ': ' : '') + err;
  }

  function showOutput(out) {
    if (!out) {
      $('cppOut').innerHTML = '<span class="cpp-dim">программа ничего не вывела</span>';
    } else {
      $('cppOut').textContent = out;
    }
  }

  function run() {
    var code = $('cppCode').value;
    var res = window.CppEngine.run(code, $('cppStdin').value);
    showOutput(res.ok ? res.output : '');
    showError(res.ok ? null : res.error, res.line);
    return res;
  }

  /* ------------------------------- тесты ------------------------------- */
  function renderTests(task, results) {
    var html = '';
    task.tests.forEach(function (t, i) {
      var r = results ? results[i] : null;
      var cls = r ? (r.ok ? 'pass' : 'fail') : '';
      var mark = r ? (r.ok ? '✔' : '✕') : '·';
      html += '<div class="cpp-test ' + cls + '">' +
        '<div class="cpp-test-head"><b>' + mark + ' тест ' + (i + 1) + '</b>' +
        '<span>ввод: ' + (t.stdin ? esc(t.stdin.replace(/\n/g, ' ⏎ ')) : 'нет') + '</span></div>' +
        '<pre>ожидалось:\n' + esc(t.expected) + '</pre>';
      if (r && !r.ok) {
        html += '<pre>получено:\n' + esc(r.error ? 'ошибка: ' + r.error : (r.output || '(пусто)')) + '</pre>';
      }
      html += '</div>';
    });
    $('cppTests').innerHTML = html;
  }

  function openTask(task) {
    current = task;
    $('cppCode').value = task.starter || '';
    $('cppStdin').value = (task.tests[0] && task.tests[0].stdin) || '';
    showOutput('');
    showError(null);
    renderGutter();
    renderTests(task, null);
  }

  /* ------------------------------- проверка ------------------------------- */
  function check(task) {
    var code = $('cppCode').value;
    var results = [];
    var checks = [];

    var empty = !code.replace(/\s|#\S+.*|\/\/.*|\/\*[\s\S]*?\*\//g, '');
    if (empty) {
      return [{ ok: false, label: 'в редакторе пусто', note: 'напиши программу и нажми «Проверить»' }];
    }

    var anyError = null;
    task.tests.forEach(function (t) {
      var res = window.CppEngine.run(code, t.stdin || '');
      var got = res.ok ? normalize(res.output) : null;
      var want = normalize(t.expected);
      results.push({
        ok: !!res.ok && got === want,
        output: res.ok ? res.output : null,
        error: res.ok ? null : res.error,
        line: res.line
      });
      if (!res.ok && !anyError) anyError = { error: res.error, line: res.line, stdin: t.stdin };
    });

    renderTests(task, results);
    if (anyError) {
      showError(anyError.error, anyError.line);
    } else {
      var last = window.CppEngine.run(code, task.tests[0].stdin || '');
      showOutput(last.ok ? last.output : '');
      showError(null);
    }

    if (anyError) {
      checks.push({ ok: false, label: 'программа выполняется без ошибок', note: (anyError.line ? 'строка ' + anyError.line + ': ' : '') + anyError.error });
    } else {
      checks.push({ ok: true, label: 'программа выполняется без ошибок' });
    }

    var passed = results.filter(function (r) { return r.ok; }).length;
    task.tests.forEach(function (t, i) {
      var r = results[i];
      var label = 'тест ' + (i + 1) + (t.stdin ? ' (ввод: ' + t.stdin.replace(/\n/g, ' ') + ')' : ' (без ввода)');
      if (r.ok) checks.push({ ok: true, label: label });
      else {
        checks.push({
          ok: false,
          label: label,
          note: r.error ? 'ошибка: ' + r.error : 'ожидалось «' + normalize(t.expected) + '», получено «' + normalize(r.output) + '»'
        });
      }
    });

    return checks;
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('btnRun').addEventListener('click', run);
    $('btnResetCode').addEventListener('click', function () {
      if (!current) return;
      $('cppCode').value = current.starter || '';
      renderGutter();
      showOutput('');
      showError(null);
      renderTests(current, null);
    });

    $('cppCode').addEventListener('input', renderGutter);
    $('cppCode').addEventListener('scroll', function () { $('cppGutter').scrollTop = $('cppCode').scrollTop; });
    $('cppCode').addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        var el = e.target, start = el.selectionStart, end = el.selectionEnd;
        el.value = el.value.slice(0, start) + '    ' + el.value.slice(end);
        el.selectionStart = el.selectionEnd = start + 4;
        renderGutter();
      }
      if (e.key === 'Enter') {
        var el2 = e.target, s = el2.selectionStart;
        var before = el2.value.slice(0, s);
        var lineStart = before.lastIndexOf('\n') + 1;
        var indent = (before.slice(lineStart).match(/^[ \t]*/) || [''])[0];
        if (/[{]\s*$/.test(before)) indent += '    ';
        if (!indent) return;
        e.preventDefault();
        el2.value = el2.value.slice(0, s) + '\n' + indent + el2.value.slice(el2.selectionEnd);
        el2.selectionStart = el2.selectionEnd = s + 1 + indent.length;
        renderGutter();
      }
    });

    window.Shell.init({
      storageKey: 'cpp.v1',
      productTitle: 'C++-класс',
      productSubtitle: 'свой компилятор в браузере',
      tasks: window.CPP_TASKS,
      open: openTask,
      check: check
    });

    window.__solve = function (i) {
      var t = window.CPP_TASKS[i];
      if (window.Shell && window.Shell.openTask) window.Shell.openTask(i);
      else openTask(t);
      $('cppCode').value = t.solution;
      $('cppStdin').value = (t.tests[0] && t.tests[0].stdin) || '';
      renderGutter();
      run();
    };
  });
})();
