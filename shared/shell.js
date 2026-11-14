/* ==========================================================================
   Shell — общий каркас тренажёров IT-квантума.
   Даёт: список задач с прогрессом, карточку задания, кнопку проверки,
   подсказку, разбор результатов и хранение прогресса в браузере.
   Продукт подключает свои задачи и две функции: open(task) и check(task).
   ========================================================================== */
(function (global) {
  'use strict';

  var cfg = null;
  var st = { solved: {}, current: 0, showAll: false };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function save() {
    try { localStorage.setItem(cfg.storageKey, JSON.stringify(st)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(cfg.storageKey);
      if (!raw) return;
      var d = JSON.parse(raw);
      st.solved = d.solved || {};
      st.showAll = !!d.showAll;
    } catch (e) {}
  }
  function tasks() { return cfg.tasks; }
  function task(i) { return cfg.tasks[i]; }
  function unlocked(i) { return st.showAll || i === 0 || !!st.solved[cfg.tasks[i - 1].id]; }
  function solvedCount() {
    var n = 0;
    cfg.tasks.forEach(function (t) { if (st.solved[t.id]) n++; });
    return n;
  }

  function renderSidebar() {
    var html = '';
    cfg.tasks.forEach(function (t, i) {
      var done = !!st.solved[t.id];
      var lock = !unlocked(i);
      html += '<button class="task-item' + (i === st.current ? ' active' : '') + (done ? ' done' : '') +
        (lock ? ' locked' : '') + '" data-i="' + i + '">' +
        '<span class="num">' + (done ? '✓' : (lock ? '🔒' : (i + 1))) + '</span>' +
        '<span class="t-main"><span class="t-title">' + esc(t.title) + '</span>' +
        '<span class="t-sub">' + esc(t.subtitle || '') + '</span></span></button>';
    });
    $('taskList').innerHTML = html;
    Array.prototype.forEach.call($('taskList').querySelectorAll('.task-item'), function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-i'), 10);
        if (unlocked(i)) openTask(i);
      });
    });
  }

  function renderProgress() {
    var n = solvedCount();
    $('progressBar').style.width = (n / cfg.tasks.length * 100) + '%';
    $('progressText').innerHTML = '<b>' + n + '</b> из ' + cfg.tasks.length + ' задач';
  }

  function openTask(i) {
    st.current = i;
    var t = tasks()[i];
    $('taskTitle').textContent = t.title;
    $('taskSub').textContent = t.subtitle || '';
    $('taskModule').textContent = cfg.productTitle || '';
    var lvl = $('taskLevel');
    if (t.level) {
      lvl.textContent = t.level;
      lvl.className = 'chip level-' + (t.level === 'легко' ? 'easy' : t.level === 'средне' ? 'mid' : 'hard');
    } else { lvl.textContent = ''; lvl.className = 'chip'; }

    $('theory').innerHTML = t.theory || '';
    $('prompt').innerHTML = t.prompt || '';
    var ex = '';
    (t.examples || []).forEach(function (e) {
      ex += '<div class="example"><div class="lbl">' + esc(e.label || 'пример') + '</div><pre>' + esc(e.text) + '</pre></div>';
    });
    $('examples').innerHTML = ex;
    var hint = $('hintBox');
    hint.textContent = t.hint || 'Подсказки нет — попробуй сам.';
    hint.classList.remove('show');

    $('panel-check').innerHTML = '<pre class="out empty">Пока пусто. Выполни задание в рабочей области и нажми «Проверить».</pre>';
    if (cfg.open) cfg.open(t, st);
    renderSidebar();
    renderProgress();
    save();
  }

  function runCheck() {
    var t = tasks()[st.current];
    var results;
    try {
      results = cfg.check(t, st) || [];
    } catch (e) {
      results = [{ ok: false, label: 'Ошибка проверки: ' + (e && e.message ? e.message : e) }];
    }
    var passed = results.filter(function (r) { return r.ok; }).length;
    var allOk = results.length > 0 && passed === results.length;

    var html = '';
    html += allOk
      ? '<div class="summary good">✔ Готово: все ' + results.length + ' проверок пройдены.</div>'
      : '<div class="summary bad">Пройдено ' + passed + ' из ' + results.length + ' проверок. Ниже видно, что именно не так.</div>';
    html += '<div class="check-list">';
    results.forEach(function (r) {
      html += '<div class="check-item ' + (r.ok ? 'pass' : 'fail') + '">' +
        '<span class="mark">' + (r.ok ? '✔' : '✕') + '</span><div>' + esc(r.label) +
        (r.note ? '<div class="note">' + esc(r.note) + '</div>' : '') + '</div></div>';
    });
    html += '</div>';

    if (allOk) {
      var first = !st.solved[t.id];
      st.solved[t.id] = true;
      save();
      if (first) html += '<div class="celebrate">Задача закрыта — прогресс сохранён.</div>';
      if (st.current + 1 < tasks().length) {
        html += '<div class="celebrate"><button class="btn ok" id="goNext">Следующая задача →</button></div>';
      } else {
        html += '<div class="celebrate"><b>Это последняя задача продукта.</b> Возвращайся на главную и пробуй другой тренажёр.</div>';
      }
      renderSidebar();
      renderProgress();
    }
    $('panel-check').innerHTML = html;
    var next = $('goNext');
    if (next) next.addEventListener('click', function () { openTask(st.current + 1); });
    $('panel-check').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function init(config) {
    cfg = config;
    load();
    if ($('productTitle')) $('productTitle').textContent = cfg.productTitle || '';
    if ($('productSub')) $('productSub').textContent = cfg.productSubtitle || '';

    $('btnCheck').addEventListener('click', runCheck);
    $('btnHint').addEventListener('click', function () { $('hintBox').classList.toggle('show'); });
    $('btnShowAll').addEventListener('click', function () {
      st.showAll = !st.showAll;
      save();
      this.textContent = st.showAll ? 'Обычный режим' : 'Открыть все задачи';
      renderSidebar();
    });
    $('btnResetProgress').addEventListener('click', function () {
      if (!confirm('Сбросить прогресс продукта?')) return;
      st.solved = {};
      st.showAll = false;
      save();
      $('btnShowAll').textContent = 'Открыть все задачи';
      openTask(0);
    });
    $('btnShowAll').textContent = st.showAll ? 'Обычный режим' : 'Открыть все задачи';

    var start = 0;
    for (var i = 0; i < tasks().length; i++) { if (!st.solved[tasks()[i].id]) { start = i; break; } }
    openTask(unlocked(start) ? start : 0);
    if (cfg.onReady) cfg.onReady(st);
  }

  global.Shell = {
    init: init,
    state: st,
    openTask: openTask,
    runCheck: runCheck,
    unlocked: unlocked,
    esc: esc,
    save: save
  };
})(typeof window !== 'undefined' ? window : globalThis);
