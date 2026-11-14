/* ==========================================================================
   Кибербезопасность: base64, шифр Цезаря, хеши, разбор HTTP-заголовков.
   ========================================================================== */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---- кодировки ---- */
  function b64enc(s) { return btoa(unescape(encodeURIComponent(String(s)))); }
  function b64dec(s) {
    try { return decodeURIComponent(escape(atob(String(s).replace(/\s+/g, '')))); }
    catch (e) { return null; }
  }
  function caesar(text, k) {
    return String(text).replace(/[a-z]/gi, function (c) {
      var base = c === c.toLowerCase() ? 97 : 65;
      return String.fromCharCode((c.charCodeAt(0) - base + k + 26 * 4) % 26 + base);
    });
  }
  function fnv(s) {
    var h = 0x811c9dc5 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  var DICT = ['123456', 'qwerty', 'password', 'letmein', 'school2019', 'sunshine', 'football', 'iloveyou'];

  /* ---- разбор заголовков ---- */
  function parseHeaders(text) {
    var lines = String(text).replace(/\r/g, '').split('\n');
    var out = [];
    lines.forEach(function (line) {
      var m = /^\s*([A-Za-z0-9-]+)\s*:\s*(.*)$/.exec(line);
      if (m) out.push({ name: m[1], value: m[2] });
    });
    return out;
  }

  /* ---- правила пароля ---- */
  function passRules(p) {
    p = String(p || '');
    var low = p.toLowerCase();
    return [
      { key: 'len', label: 'длина не меньше 12 символов', ok: p.length >= 12 },
      { key: 'lower', label: 'есть строчная буква', ok: /[a-zа-я]/.test(p) },
      { key: 'upper', label: 'есть заглавная буква', ok: /[A-ZА-Я]/.test(p) },
      { key: 'digit', label: 'есть цифра', ok: /\d/.test(p) },
      { key: 'spec', label: 'есть спецсимвол (!@#$%^&*_-+=?)', ok: /[!@#$%^&*_\-+=?]/.test(p) },
      { key: 'nodict', label: 'нет простых слов и дат (123456, qwerty, password, 2019…)', ok: !DICT.some(function (w) { return low.indexOf(w) >= 0; }) && !/(19|20)\d\d/.test(p) },
      { key: 'norepeat', label: 'нет повторов вида aaa / 111', ok: !/(.)\1\1/.test(p) }
    ];
  }

  /* ---- колонка инструментов ---- */
  function renderDict() {
    var rows = DICT.map(function (p) { return '<tr><td>' + esc(p) + '</td><td><code>' + fnv(p) + '</code></td></tr>'; }).join('');
    $('hashDict').innerHTML = '<table class="data-table"><thead><tr><th>пароль</th><th>хеш</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function bindTools() {
    $('btnB64enc').addEventListener('click', function () {
      var r = b64enc($('b64Input').value);
      $('b64Out').textContent = r;
    });
    $('btnB64dec').addEventListener('click', function () {
      var r = b64dec($('b64Input').value);
      $('b64Out').textContent = r === null ? 'не получиется: это не корректный base64' : r;
    });

    $('btnCesar').addEventListener('click', function () {
      var text = $('cesarInput').value, k = parseInt($('cesarShift').value, 10) || 0;
      var html = '';
      for (var i = 1; i <= 25; i++) {
        html += '<div class="prompt-line" style="padding:2px 0"><span style="color:#6b7a94">сдвиг ' + (i < 10 ? ' ' : '') + i + ' →</span> ' +
          esc(caesar(text, -i)) + '</div>';
      }
      $('cesarOut').innerHTML = '<div style="color:#8b97ad;margin-bottom:6px">заданный сдвиг ' + k + ' (расшифровка −' + k + '): <b style="color:#7ee787">' + esc(caesar(text, -k)) + '</b></div>' + html;
    });

    $('btnHash').addEventListener('click', function () {
      var v = $('hashInput').value;
      $('hashOut').textContent = fnv(v);
    });

    $('btnParseHdr').addEventListener('click', function () {
      var list = parseHeaders($('hdrInput').value);
      if (!list.length) { $('hdrOut').textContent = 'заголовки не найдены'; return; }
      $('hdrOut').innerHTML = '<table class="data-table"><thead><tr><th>заголовок</th><th>значение</th></tr></thead><tbody>' +
        list.map(function (h) { return '<tr><td><code>' + esc(h.name) + '</code></td><td>' + esc(h.value) + '</td></tr>'; }).join('') + '</tbody></table>';
    });
  }

  /* ---- панель ответа ---- */
  function setAnswerMode(task) {
    ['ansTextWrap', 'ansRowsWrap', 'ansCodeWrap', 'ansPassWrap'].forEach(function (id) { $(id).style.display = 'none'; });
    if (task.answer === 'rows') {
      $('ansRowsWrap').style.display = '';
      var html = '<table class="data-table"><thead><tr><th>#</th><th>заголовок</th><th>оценка</th></tr></thead><tbody>';
      task.headers.forEach(function (h, i) {
        html += '<tr><td>' + (i + 1) + '</td><td><code>' + esc(h.name) + '</code></td><td>' +
          '<select class="hdr-sel" data-i="' + i + '"><option value="">— выбери —</option>' +
          '<option value="ok">безопасно</option><option value="bad">проблема</option></select></td></tr>';
      });
      $('ansRows').innerHTML = html + '</tbody></table>';
      Array.prototype.forEach.call(document.querySelectorAll('.hdr-sel'), function (s) { s.value = ''; });
    } else if (task.answer === 'code') {
      $('ansCodeWrap').style.display = '';
      $('ansLine').value = '';
      $('ansKind').value = '';
      if ($('secCodeBox') && task.code) $('secCodeBox').textContent = task.code;
    } else if (task.answer === 'password') {
      $('ansPassWrap').style.display = '';
      $('ansPass').value = '';
      renderPassRules();
    } else {
      $('ansTextWrap').style.display = '';
      $('ansText').value = '';
    }
  }

  function renderPassRules() {
    var rules = passRules($('ansPass').value);
    $('passRules').innerHTML = rules.map(function (r) {
      return '<div class="check-item ' + (r.ok ? 'ok' : '') + '"><span class="mark">' + (r.ok ? '✓' : '·') + '</span><span>' + esc(r.label) + '</span></div>';
    }).join('');
  }

  window.SECAPI = {
    b64enc: b64enc, b64dec: b64dec, caesar: caesar, hash: fnv,
    parseHeaders: parseHeaders, dict: DICT, passRules: passRules
  };

  document.addEventListener('DOMContentLoaded', function () {
    renderDict();
    bindTools();
    $('ansPass').addEventListener('input', renderPassRules);

    window.Shell.init({
      storageKey: 'security.v1',
      productTitle: 'Кибербезопасность',
      productSubtitle: 'шифры, хеши, заголовки, уязвимости',
      tasks: window.SEC_TASKS,
      open: function (task) {
        setAnswerMode(task);
        if (task.headers) {
          $('hdrInput').value = task.headers.map(function (h) { return h.name + ': ' + h.value; }).join('\n');
        }
      },
      check: function (task) {
        var out = [];
        if (task.answer === 'rows') {
          var sels = document.querySelectorAll('.hdr-sel');
          var right = 0;
          task.headers.forEach(function (h, i) {
            var v = sels[i] ? sels[i].value : '';
            if (v === h.verdict) { right++; out.push({ ok: true, label: 'заголовок ' + h.name + ' — верно' }); }
            else out.push({ ok: false, label: 'заголовок ' + h.name, note: v ? 'оценка неверная' : 'оценка не выбрана' });
          });
          return [{ ok: right === task.headers.length, label: 'все ' + task.headers.length + ' заголовков оценены верно', note: 'верно: ' + right }].concat(out);
        }
        if (task.answer === 'code') {
          var line = String($('ansLine').value).trim().replace(/\D/g, '');
          var kind = $('ansKind').value;
          out.push({ ok: line === String(task.vulnLine), label: 'номер уязвимой строки: ' + task.vulnLine, note: line ? 'твой ответ: ' + line : 'укажи номер' });
          out.push({ ok: kind === task.vulnKind, label: 'тип уязвимости: ' + task.vulnKind, note: kind ? 'твой ответ: ' + kind : 'выбери тип из списка' });
          return out;
        }
        if (task.answer === 'password') {
          var rules = passRules($('ansPass').value);
          var bad = rules.filter(function (r) { return !r.ok; });
          return rules.map(function (r) { return { ok: r.ok, label: r.label }; })
            .concat([{ ok: bad.length === 0, label: 'пароль проходит все правила', note: bad.length ? 'не выполнено: ' + bad.length : '' }]);
        }
        var val = String($('ansText').value || '').trim();
        var norm = function (s) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); };
        return [{ ok: norm(val) === norm(task.expected), label: 'верный ответ', note: val ? '' : 'впиши ответ в поле справа' }];
      }
    });

    window.__solve = function (i) {
      var task = window.SEC_TASKS[i];
      setAnswerMode(task);
      if (task.answer === 'rows') {
        Array.prototype.forEach.call(document.querySelectorAll('.hdr-sel'), function (s) {
          s.value = task.headers[parseInt(s.getAttribute('data-i'), 10)].verdict;
        });
      } else if (task.answer === 'code') {
        $('ansLine').value = String(task.vulnLine);
        $('ansKind').value = task.vulnKind;
      } else if (task.answer === 'password') {
        $('ansPass').value = task.samplePassword;
        renderPassRules();
      } else {
        $('ansText').value = task.expected;
      }
    };
  });
})();
