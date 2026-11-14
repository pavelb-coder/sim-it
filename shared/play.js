/* ==========================================================================
   Песочница свободного кода — общая логика.
   Продукт задаёт window.PLAY_CONFIG: движок (run), примеры, шпаргалку.
   Ничего не отправляется в сеть: код исполняет движок прямо в браузере.
   ========================================================================== */
(function (global) {
  'use strict';

  var cfg = global.PLAY_CONFIG || {};
  function $(id) { return document.getElementById(id); }

  var codeEl, stdinEl, gutterEl, outEl, errEl, statusEl;

  /* ---------------------------- хранение ---------------------------- */
  function save() {
    try {
      localStorage.setItem(cfg.storageKey, JSON.stringify({ code: codeEl.value, stdin: stdinEl.value }));
    } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(cfg.storageKey);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (typeof d.code !== 'string') return null;
      return d;
    } catch (e) { return null; }
  }

  /* ---------------------------- интерфейс ---------------------------- */
  function renderGutter() {
    var lines = codeEl.value.split('\n').length;
    var html = '';
    for (var i = 1; i <= Math.max(lines, 1); i++) html += i + '\n';
    gutterEl.textContent = html;
    gutterEl.scrollTop = codeEl.scrollTop;
  }

  function setStatus(text, bad) {
    statusEl.innerHTML = text;
    statusEl.className = 'play-status' + (bad ? ' bad' : '');
  }

  function showOut(text) {
    if (!text) {
      outEl.innerHTML = '<span class="play-dim">программа ничего не напечатала</span>';
      return;
    }
    outEl.textContent = text;
  }

  function showError(text) {
    if (!text) { errEl.style.display = 'none'; errEl.textContent = ''; return; }
    errEl.style.display = '';
    errEl.textContent = text;
  }

  /* ------------------------------ запуск ------------------------------ */
  function run() {
    var code = codeEl.value;
    var stdin = stdinEl.value;
    save();
    showError('');
    var t0 = Date.now();
    var res;
    try {
      res = cfg.run(code, stdin);
    } catch (e) {
      showOut('');
      showError('Внутренняя ошибка площадки: ' + (e && e.message ? e.message : e));
      setStatus('сбой', true);
      return;
    }
    var ms = (res && res.ms) || (Date.now() - t0);
    showOut(res && res.output ? res.output : '');
    if (res && res.error) {
      var e = res.error;
      var where = e.line ? ('строка ' + e.line + ': ') : '';
      showError((e.kind ? e.kind + '. ' : '') + where + e.msg);
      setStatus('<b>✕</b> ошибка', true);
    } else {
      setStatus('<b>✔</b> выполнено за ' + ms + ' мс');
    }
    if (res && res.output) {
      outEl.scrollTop = 0;
    }
  }

  /* ------------------------------ примеры ------------------------------ */
  function fillExamples(select) {
    var html = '<option value="">Примеры кода…</option>';
    (cfg.examples || []).forEach(function (ex, i) {
      html += '<option value="' + i + '">' + ex.name + '</option>';
    });
    select.innerHTML = html;
  }

  function loadExample(i) {
    var ex = (cfg.examples || [])[i];
    if (!ex) return;
    codeEl.value = ex.code;
    stdinEl.value = ex.stdin || '';
    renderGutter();
    save();
    codeEl.focus();
    run();
  }

  /* ------------------------------ события ------------------------------ */
  function bind() {
    codeEl = $('playCode');
    stdinEl = $('playStdin');
    gutterEl = $('playGutter');
    outEl = $('playOut');
    errEl = $('playErr');
    statusEl = $('playStatus');

    $('playStdinHint').textContent = cfg.stdinLabel || 'ввод';
    $('cheat').textContent = cfg.cheat || '';
    $('noteBox').innerHTML = cfg.note || '';
    if (cfg.engineLabel) $('engineBadge').textContent = cfg.engineLabel;

    fillExamples($('exampleSelect'));

    $('btnRun').addEventListener('click', run);
    $('btnClearOut').addEventListener('click', function () {
      showOut('');
      showError('');
      setStatus('вывод очищен');
    });
    $('btnReset').addEventListener('click', function () {
      codeEl.value = '';
      stdinEl.value = '';
      renderGutter();
      save();
      codeEl.focus();
      setStatus('чистый лист');
    });
    $('exampleSelect').addEventListener('change', function () {
      if (this.value === '') return;
      loadExample(parseInt(this.value, 10));
      this.value = '';
    });

    codeEl.addEventListener('input', function () { renderGutter(); save(); });
    codeEl.addEventListener('scroll', function () { gutterEl.scrollTop = codeEl.scrollTop; });
    codeEl.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = this.selectionStart, en = this.selectionEnd, v = this.value;
        if (s !== en && v.slice(s, en).indexOf('\n') >= 0) {
          var from = v.lastIndexOf('\n', s - 1) + 1;
          var block = v.slice(from, en);
          var shift = e.shiftKey ? block.replace(/^ {1,4}/gm, '') : block.replace(/^/gm, '    ');
          this.value = v.slice(0, from) + shift + v.slice(en);
          this.selectionStart = from;
          this.selectionEnd = from + shift.length;
        } else {
          this.value = v.slice(0, s) + '    ' + v.slice(en);
          this.selectionStart = this.selectionEnd = s + 4;
        }
        renderGutter();
        save();
        return;
      }
      if (e.key === 'Enter') {
        var pos = this.selectionStart, v2 = this.value;
        var lineStart = v2.lastIndexOf('\n', pos - 1) + 1;
        var line = v2.slice(lineStart, pos);
        var indent = (line.match(/^ */) || [''])[0];
        if (/[:{(]\s*$/.test(line)) indent += '    ';
        if (!indent) return;
        e.preventDefault();
        this.value = v2.slice(0, pos) + '\n' + indent + v2.slice(pos);
        this.selectionStart = this.selectionEnd = pos + 1 + indent.length;
        renderGutter();
        save();
      }
    });

    /* стартовое состояние */
    var saved = load();
    if (saved) {
      codeEl.value = saved.code;
      stdinEl.value = saved.stdin || '';
    } else {
      codeEl.value = cfg.defaultCode || '';
      stdinEl.value = cfg.defaultStdin || '';
    }
    renderGutter();
    setStatus('готов к запуску');
  }

  /* автотестам и консоли удобно дёргать одноимённую функции */
  global.__play = {
    run: run,
    setCode: function (text, stdin) {
      codeEl.value = text;
      if (stdin !== undefined) stdinEl.value = stdin;
      renderGutter();
      save();
    },
    getCode: function () { return codeEl.value; },
    output: function () { return outEl.textContent; },
    error: function () { return errEl.style.display === 'none' ? '' : errEl.textContent; },
    examples: function () { return (cfg.examples || []).length; },
    loadExample: loadExample
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})(typeof window !== 'undefined' ? window : globalThis);
