/* ==========================================================================
   Веб-студия: HTML + CSS с живым превью и проверкой по критериям.
   ========================================================================== */
(function () {
  'use strict';

  var state = { html: '', css: '' };

  function $(id) { return document.getElementById(id); }

  function doc() {
    return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><style>' +
      'body{font:15px/1.5 system-ui,sans-serif;margin:14px;color:#111;background:#fff}' +
      state.css + '</style></head><body>' + state.html + '</body></html>';
  }

  var timer = null;
  function update() {
    state.html = $('htmlCode').value;
    state.css = $('cssCode').value;
    clearTimeout(timer);
    timer = setTimeout(function () {
      $('preview').srcdoc = doc();
      var tags = (state.html.match(/<([a-z][a-z0-9-]*)/gi) || []).length;
      $('previewStatus').textContent = 'тегов: ' + tags + ' · CSS-правил: ' +
        ((state.css.match(/\{/g) || []).length);
    }, 200);
  }

  window.WEBAPI = {
    html: function () { return $('htmlCode').value; },
    css: function () { return $('cssCode').value; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    ['htmlCode', 'cssCode'].forEach(function (id) {
      $(id).addEventListener('input', update);
    });

    $('btnClean').addEventListener('click', function () {
      if (!confirm('Очистить обе панели?')) return;
      $('htmlCode').value = '';
      $('cssCode').value = '';
      update();
    });

    window.Shell.init({
      storageKey: 'web.v1',
      productTitle: 'Веб-студия',
      productSubtitle: 'HTML, CSS и живое превью',
      tasks: window.WEB_TASKS,
      open: function (task) {
        $('htmlCode').value = task.starter ? task.starter.html : '';
        $('cssCode').value = task.starter ? task.starter.css : '';
        update();
      },
      check: function (task) {
        var html = $('htmlCode').value, css = $('cssCode').value;
        return task.checks.map(function (c) {
          var ok = false;
          try { ok = !!c.fn(html, css); } catch (e) { ok = false; }
          return { ok: ok, label: c.label };
        });
      }
    });

    window.__solve = function (i) {
      if (window.Shell && window.Shell.openTask) window.Shell.openTask(i);
      var s = window.WEB_TASKS[i].solution;
      $('htmlCode').value = s.html;
      $('cssCode').value = s.css;
      update();
    };
  });
})();
