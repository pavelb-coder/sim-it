/* ==========================================================================
   SQL-тренажёр: маленький настоящий движок запросов в браузере.
   Поддержано: SELECT (поля, *, агрегаты) FROM ... WHERE ... ORDER BY ... LIMIT.
   ========================================================================== */
(function () {
  'use strict';

  var DB = {
    'ученики': {
      columns: ['id', 'имя', 'класс', 'балл'],
      rows: [
        [1, 'Аня', 9, 5], [2, 'Боря', 9, 4], [3, 'Вера', 8, 5], [4, 'Гоша', 9, 3],
        [5, 'Даша', 8, 4], [6, 'Егор', 7, 5], [7, 'Женя', 8, 2], [8, 'Зина', 9, 4]
      ]
    },
    'проекты': {
      columns: ['id', 'ученик', 'название', 'баллы'],
      rows: [
        [1, 'Аня', 'Сайт квантума', 9], [2, 'Аня', 'Бот-помощник', 7], [3, 'Боря', 'Игра-змейка', 8],
        [4, 'Вера', 'Сайт квантума', 6], [5, 'Гоша', 'Бот-помощник', 5], [6, 'Даша', 'Игра-змейка', 9]
      ]
    }
  };

  function SqlError(msg) { var e = new Error(msg); e.isSql = true; return e; }
  var IDENT = '[\\p{L}_][\\p{L}\\p{N}_]*';

  function runQuery(sql) {
    var s = String(sql || '').trim().replace(/;\s*$/, '').replace(/\s+/g, ' ');
    if (!s) throw SqlError('Запрос пустой. Начни с SELECT …');

    var m = new RegExp('^select\\s+([\\s\\S]+?)\\s+from\\s+(' + IDENT + ')', 'iu').exec(s);
    if (!m) throw SqlError('Ожидается «SELECT поля FROM таблица»');
    var colsText = m[1].trim();
    var tableName = m[2];
    var rest = s.slice(m[0].length);

    var table = DB[tableName];
    if (!table) throw SqlError('Нет такой таблицы: ' + tableName + '. Есть: ' + Object.keys(DB).join(', '));

    var whereText = null;
    var wm = new RegExp('^\\s+where\\s+([\\s\\S]+?)(?=\\s+order\\s+by\\s+|\\s+limit\\s+\\d+$|$)', 'i').exec(rest);
    if (wm) { whereText = wm[1].trim(); rest = rest.slice(wm[0].length); }

    var orderCol = null, desc = false;
    var om = new RegExp('^\\s+order\\s+by\\s+(' + IDENT + ')(\\s+desc|\\s+asc)?', 'iu').exec(rest);
    if (om) { orderCol = om[1]; desc = /desc/i.test(om[2] || ''); rest = rest.slice(om[0].length); }

    var limit = null;
    var lm = /^\s+limit\s+(\d+)/i.exec(rest);
    if (lm) { limit = parseInt(lm[1], 10); rest = rest.slice(lm[0].length); }

    if (rest.trim()) throw SqlError('Не понял конец запроса: «' + rest.trim() + '». Проверь порядок: WHERE → ORDER BY → LIMIT');

    function colIndex(name) {
      var i = table.columns.indexOf(name);
      if (i < 0) throw SqlError('В таблице ' + tableName + ' нет поля «' + name + '». Поля: ' + table.columns.join(', '));
      return i;
    }

    // WHERE
    var rows = table.rows.slice();
    if (whereText) {
      var orParts = whereText.split(/\s+or\s+/i);
      rows = rows.filter(function (row) {
        return orParts.some(function (orPart) {
          var andParts = orPart.split(/\s+and\s+/i);
          return andParts.every(function (cond) { return testCond(cond.trim(), row); });
        });
      });
    }

    function testCond(cond, row) {
      var cm = new RegExp('^(' + IDENT + ')\\s*(=|!=|<>|>=|<=|>|<|like)\\s*(.+)$', 'iu').exec(cond);
      if (!cm) throw SqlError("Не понял условие «" + cond + "». Пример: балл >= 4 или имя = 'Аня'");
      var idx = colIndex(cm[1]);
      var op = cm[2].toLowerCase();
      var raw = cm[3].trim();
      var val;
      if (/^'.*'$/.test(raw) || /^".*"$/.test(raw)) val = raw.slice(1, -1);
      else if (/^-?\d+(\.\d+)?$/.test(raw)) val = Number(raw);
      else throw SqlError('Значение «' + raw + '» должно быть числом или строкой в кавычках');
      var cell = row[idx];
      if (op === 'like') {
        var rx = new RegExp('^' + String(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i');
        return rx.test(String(cell));
      }
      var a = cell, b = val;
      if (typeof a === 'number' && typeof b === 'number') {
        if (op === '=') return a === b;
        if (op === '!=' || op === '<>') return a !== b;
        if (op === '>') return a > b;
        if (op === '<') return a < b;
        if (op === '>=') return a >= b;
        if (op === '<=') return a <= b;
      } else {
        var sa = String(a), sb = String(b);
        if (op === '=') return sa === sb;
        if (op === '!=' || op === '<>') return sa !== sb;
        if (op === '>') return sa > sb;
        if (op === '<') return sa < sb;
        if (op === '>=') return sa >= sb;
        if (op === '<=') return sa <= sb;
      }
      throw SqlError('Оператор ' + op + ' не подходит для этих значений');
    }

    // ORDER BY
    if (orderCol) {
      var oi = colIndex(orderCol);
      rows = rows.slice().sort(function (a, b) {
        var x = a[oi], y = b[oi];
        if (typeof x === 'number' && typeof y === 'number') return desc ? y - x : x - y;
        return desc ? String(y).localeCompare(String(x)) : String(x).localeCompare(String(y));
      });
    }

    // поля и агрегаты
    var columns = [], outRows = [];
    if (colsText === '*') {
      columns = table.columns.slice();
      outRows = rows.map(function (r) { return r.slice(); });
    } else {
      var parts = colsText.split(',').map(function (p) { return p.trim(); });
      var agg = null;
      var aggRe = new RegExp('^(count|sum|avg|min|max)\\s*\\(\\s*(\\*|' + IDENT + ')\\s*\\)$', 'iu');
      parts.forEach(function (p) {
        var am = aggRe.exec(p);
        if (am) agg = { fn: am[1].toUpperCase(), col: am[2] };
      });
      if (agg) {
        if (parts.length !== 1) throw new SqlError('Агрегат должен быть один в SELECT');
        var label = agg.fn + '(' + agg.col + ')';
        if (agg.fn === 'COUNT') {
          outRows = [[agg.col === '*' ? rows.length : rows.filter(function (r) { return r[colIndex(agg.col)] !== ''; }).length]];
        } else {
          var idx2 = colIndex(agg.col);
          var nums = rows.map(function (r) { return r[idx2]; }).filter(function (v) { return typeof v === 'number'; });
          var val2 = 0;
          if (agg.fn === 'SUM') val2 = nums.reduce(function (a, b) { return a + b; }, 0);
          else if (agg.fn === 'AVG') val2 = nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : 0;
          else if (agg.fn === 'MIN') val2 = nums.length ? Math.min.apply(null, nums) : 0;
          else if (agg.fn === 'MAX') val2 = nums.length ? Math.max.apply(null, nums) : 0;
          if (agg.fn === 'AVG') val2 = Math.round(val2 * 100) / 100;
          outRows = [[val2]];
        }
        columns = [label];
      } else {
        columns = parts;
        var idxs = parts.map(colIndex);
        outRows = rows.map(function (r) { return idxs.map(function (i) { return r[i]; }); });
      }
    }

    if (limit !== null) outRows = outRows.slice(0, limit);
    return { columns: columns, rows: outRows };
  }

  /* ------------------------------- интерфейс ------------------------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function renderResult(res) {
    if (!res) return '';
    var html = '<table class="data-table"><thead><tr>' +
      res.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    if (!res.rows.length) {
      html += '<tr><td colspan="' + Math.max(1, res.columns.length) + '" style="color:#8b97ad">(нет строк)</td></tr>';
    }
    res.rows.forEach(function (r) {
      html += '<tr>' + r.map(function (v) { return '<td>' + esc(typeof v === 'number' ? (Math.round(v * 100) / 100) : v) + '</td>'; }).join('') + '</tr>';
    });
    return html + '</tbody></table>';
  }

  function showSchema() {
    var html = '';
    Object.keys(DB).forEach(function (name) {
      var t = DB[name];
      html += '<div class="ws-label" style="margin:8px 0 4px">' + esc(name) + ' (' + t.columns.join(', ') + ')</div>';
      html += renderResult({ columns: t.columns, rows: t.rows });
    });
    $('schemaBox').innerHTML = html;
  }

  window.SQLAPI = {
    run: function (sql) { return runQuery(sql); },
    db: function () { return DB; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    showSchema();

    $('btnRunSql').addEventListener('click', function () {
      try {
        var res = runQuery($('sqlInput').value);
        $('sqlResult').innerHTML = renderResult(res);
        $('sqlError').textContent = '';
      } catch (e) {
        $('sqlResult').innerHTML = '';
        $('sqlError').textContent = 'Ошибка: ' + e.message;
      }
    });
    $('sqlInput').addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') $('btnRunSql').click();
    });

    window.Shell.init({
      storageKey: 'sql.v1',
      productTitle: 'SQL-тренажёр',
      productSubtitle: 'запросы к настоящей базе',
      tasks: window.SQL_TASKS,
      open: function (task) {
        $('sqlInput').value = task.starter || '';
        $('sqlResult').innerHTML = '';
        $('sqlError').textContent = '';
      },
      check: function (task) {
        var sql = $('sqlInput').value;
        var expected;
        try { expected = runQuery(task.solution); }
        catch (e) { return [{ ok: false, label: 'внутренняя ошибка эталона: ' + e.message }]; }

        var got;
        try {
          got = runQuery(sql);
          $('sqlResult').innerHTML = renderResult(got);
          $('sqlError').textContent = '';
        } catch (e) {
          $('sqlError').textContent = 'Ошибка: ' + e.message;
          return [{ ok: false, label: 'запрос не выполняется', note: e.message }];
        }

        var checks = [];
        var sameCols = JSON.stringify(got.columns) === JSON.stringify(expected.columns);
        checks.push({
          ok: sameCols,
          label: 'нужные столбцы: ' + expected.columns.join(', '),
          note: sameCols ? '' : 'получено: ' + got.columns.join(', ')
        });
        var sameRows = JSON.stringify(got.rows) === JSON.stringify(expected.rows);
        checks.push({
          ok: sameRows,
          label: 'правильные строки результата (' + expected.rows.length + ')',
          note: sameRows ? '' : 'получено строк: ' + got.rows.length + ', ожидалось: ' + expected.rows.length
        });
        return checks;
      }
    });

    window.__solve = function (i) {
      $('sqlInput').value = window.SQL_TASKS[i].solution;
      try { $('sqlResult').innerHTML = renderResult(runQuery($('sqlInput').value)); } catch (e) {}
    };
  });
})();
