/* ==========================================================================
   Терминал Linux в браузере: виртуальная файловая система и команды.
   Ничего не установлено и не сломано — всё живёт в памяти вкладки.
   ========================================================================== */
(function () {
  'use strict';

  var HOME = '/home/student';
  var state = { fs: null, cwd: HOME, history: [], log: [] };

  /* ---------------------------- файловая система ---------------------------- */
  function file(content, mode) { return { type: 'file', content: content, mode: mode || '644' }; }
  function dir(children, mode) { return { type: 'dir', children: children || {}, mode: mode || '755' }; }

  function freshFS() {
    return dir({
      home: dir({
        student: dir({
          'читай.txt': file('Добро пожаловать в IT-квантум!\nЗдесь учатся работать в терминале.\n' +
            'Если забыл команду — набери help и нажми Enter.\n'),
          'данные': dir({
            'отчёт.txt': file('кванториум: отчёт за месяц\nсделано: 12 проектов\nучастников: 24\n'),
            'журнал.txt': file('пн: занятие\nвт: занятие\nср: занятие\nчт: занятие\nпт: занятие\nсб: проект\nвс: выходной\n'),
            'старый.tmp': file('временный файл\n'),
            'секрет.txt': file('ключ: 1234\n'),
            'notes.md': file('# заметки\n- сделать проект\n- сдать задачу\n')
          }),
          'архив': dir({}),
          'мусор': dir({
            'a.tmp': file('x\n'),
            'b.tmp': file('y\n'),
            'важное.txt': file('не удалять!\n')
          })
        })
      }),
      etc: dir({ motd: file('IT-квантум · тренажёр терминала\n') }),
      var: dir({ log: dir({}) })
    });
  }

  function splitPath(p) {
    return String(p).split('/').filter(function (s) { return s.length; });
  }
  function absPath(p, cwd) {
    if (p === '~') p = HOME;
    else if (p.indexOf('~/') === 0) p = HOME + p.slice(1);
    if (p.charAt(0) !== '/') p = (cwd || state.cwd) + '/' + p;
    var out = [];
    splitPath(p).forEach(function (part) {
      if (part === '.') return;
      if (part === '..') { out.pop(); return; }
      out.push(part);
    });
    return '/' + out.join('/');
  }
  function nodeAt(path) {
    var parts = splitPath(absPath(path));
    var cur = state.fs;
    for (var i = 0; i < parts.length; i++) {
      if (!cur || cur.type !== 'dir' || !cur.children[parts[i]]) return null;
      cur = cur.children[parts[i]];
    }
    return cur;
  }
  function parentOf(path) {
    var abs = absPath(path);
    var parts = splitPath(abs);
    var name = parts.pop();
    return { parent: nodeAt('/' + parts.join('/')), name: name, dir: '/' + parts.join('/') };
  }
  function globExpand(pattern) {
    var abs = absPath(pattern);
    var parts = splitPath(abs);
    if (parts.every(function (p) { return p.indexOf('*') < 0; })) return [abs];
    var results = [''];
    parts.forEach(function (part) {
      var next = [];
      results.forEach(function (prefix) {
        if (part.indexOf('*') < 0) { next.push(prefix + '/' + part); return; }
        var node = nodeAt(prefix || '/');
        if (!node || node.type !== 'dir') return;
        var re = new RegExp('^' + part.replace(/[.+^$[\]\\(){}|]/g, '\\$&').replace(/\*/g, '.*') + '$');
        Object.keys(node.children).forEach(function (name) {
          if (re.test(name)) next.push(prefix + '/' + name);
        });
      });
      results = next;
    });
    return results;
  }
  function modeString(node) {
    var m = node.mode || (node.type === 'dir' ? '755' : '644');
    var s = node.type === 'dir' ? 'd' : '-';
    [m.charAt(0), m.charAt(1), m.charAt(2)].forEach(function (d) {
      var n = parseInt(d, 10);
      s += (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? 'x' : '-');
    });
    return s;
  }
  function displayName(p) { return splitPath(p).pop(); }
  function isUnderHome(p) { return absPath(p) === HOME || absPath(p).indexOf(HOME + '/') === 0; }

  /* -------------------------------- парсер -------------------------------- */
  function tokenize(line) {
    var out = [], cur = '', quote = null, has = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (quote) {
        if (c === quote) quote = null; else cur += c;
        has = true;
        continue;
      }
      if (c === '"' || c === "'") { quote = c; has = true; continue; }
      if (c === ' ' || c === '\t') {
        if (cur.length || has) { out.push(cur); cur = ''; has = false; }
        continue;
      }
      cur += c; has = true;
    }
    if (cur.length || has) out.push(cur);
    return out;
  }

  /* ------------------------------- команды ------------------------------- */
  var HELP = [
    'Доступные команды:',
    '  pwd                        — где я нахожусь',
    '  ls [-l] [путь]             — что лежит в папке',
    '  cd [путь]                  — перейти в папку (cd ~ — домой, cd .. — наверх)',
    '  mkdir [-p] путь            — создать папку',
    '  touch файл                 — создать пустой файл',
    '  cat файл                   — показать содержимое',
    '  echo "текст" [> файл]      — вывести текст или записать в файл (>> — дописать)',
    '  cp откуда куда             — копировать',
    '  mv откуда куда             — переместить или переименовать',
    '  rm [-r] путь               — удалить (без корзины!)',
    '  grep [-r] слово [путь]     — найти строки со словом',
    '  wc [-l] файл               — посчитать строки',
    '  head/tail [-n N] файл      — первые/последние строки',
    '  chmod 600 файл             — выставить права',
    '  whoami · date · history    — кто я, дата, история команд',
    '  clear                      — очистить экран',
    '',
    'Шаблоны: * подставляет любые имена, например ls данные/*.txt'
  ].join('\n');

  // перенаправление вывода работает для любой команды: ls > файл, grep -r x . >> журнал
  function run(line) {
    var tokens = tokenize(String(line).trim());
    if (!tokens.length) return { out: [], cwd: state.cwd };
    var redirIdx = -1;
    for (var ri = 0; ri < tokens.length; ri++) {
      if (tokens[ri] === '>' || tokens[ri] === '>>') { redirIdx = ri; break; }
    }
    if (redirIdx < 0) return execTokens(tokens);

    var mode = tokens[redirIdx];
    var target = tokens[redirIdx + 1];
    if (!target) return { out: ['ошибка: после ' + mode + ' нужно имя файла'], err: true, cwd: state.cwd };
    var res = execTokens(tokens.slice(0, redirIdx));
    var text = (res.out || []).join('\n');
    if (text) text += '\n';
    var absR = absPath(target);
    var infoR = parentOf(absR);
    if (!infoR.parent || infoR.parent.type !== 'dir') {
      return { out: ['ошибка: нет папки для файла ' + target], err: true, cwd: res.cwd };
    }
    var existingR = infoR.parent.children[infoR.name];
    if (existingR && existingR.type === 'dir') {
      return { out: ['ошибка: ' + target + ' — это папка'], err: true, cwd: res.cwd };
    }
    if (mode === '>>' && existingR) text = (existingR.content || '') + text;
    infoR.parent.children[infoR.name] = file(text, existingR ? existingR.mode : '644');
    return { out: [], cwd: res.cwd, err: res.err };
  }

  function execTokens(tokens) {
    var out = [];
    var cmd = tokens.shift();
    var flags = tokens.filter(function (t) { return t.charAt(0) === '-' && t.length > 1 && t !== '>' && t !== '>>'; });
    var args = tokens.filter(function (t) { return !(t.charAt(0) === '-' && t.length > 1); });
    function hasFlag(f) { return flags.indexOf('-' + f) >= 0 || flags.indexOf('-' + f) === 0 && false || flags.some(function (x) { return x.replace(/-/g, '').indexOf(f) >= 0; }); }

    function fail(msg) { return { out: ['ошибка: ' + msg], err: true, cwd: state.cwd }; }

    switch (cmd) {
      case 'help': return { out: HELP.split('\n'), cwd: state.cwd };
      case 'clear': return { out: [], clear: true, cwd: state.cwd };
      case 'pwd': return { out: [state.cwd], cwd: state.cwd };
      case 'whoami': return { out: ['student'], cwd: state.cwd };
      case 'date': return { out: [new Date().toLocaleString('ru-RU')], cwd: state.cwd };
      case 'history':
        return { out: state.history.map(function (h, i) { return '  ' + (i + 1) + '  ' + h; }), cwd: state.cwd };

      case 'ls': {
        var targets = args.length ? args : ['.'];
        var lines = [];
        targets.forEach(function (t) {
          globExpand(t).forEach(function (p) {
            var node = nodeAt(p);
            if (!node) { lines.push('ls: нет такого файла или папки: ' + t); return; }
            if (node.type === 'file') { lines.push(hasFlag('l') ? modeString(node) + '  ' + displayName(p) : displayName(p)); return; }
            var names = Object.keys(node.children).sort();
            if (targets.length > 1) lines.push(displayName(p) + ':');
            names.forEach(function (n) {
              var child = node.children[n];
              if (hasFlag('l')) {
                var size = child.type === 'file' ? String((child.content || '').length) : '4096';
                lines.push(modeString(child) + '  ' + size.padStart(6) + '  ' + n + (child.type === 'dir' ? '/' : ''));
              } else {
                lines.push(n + (child.type === 'dir' ? '/' : ''));
              }
            });
            if (!names.length) lines.push('(пусто)');
          });
        });
        return { out: lines, cwd: state.cwd };
      }

      case 'cd': {
        var target = args[0] || HOME;
        var node = nodeAt(target);
        if (!node) return fail('нет такой папки: ' + target);
        if (node.type !== 'dir') return fail('это файл, а не папка: ' + target);
        return { out: [], cwd: absPath(target) };
      }

      case 'mkdir': {
        if (!args.length) return fail('укажи имя папки');
        var made = [];
        args.forEach(function (a) {
          var abs = absPath(a);
          if (hasFlag('p')) {
            var parts = splitPath(abs);
            var cur = state.fs;
            parts.forEach(function (part) {
              if (!cur.children[part]) cur.children[part] = dir({});
              cur = cur.children[part];
            });
            made.push(abs);
          } else {
            var info = parentOf(abs);
            if (!info.parent || info.parent.type !== 'dir') return made.push('ошибка: нет папки ' + info.dir);
            if (info.parent.children[info.name]) return made.push('ошибка: «' + info.name + '» уже существует');
            info.parent.children[info.name] = dir({});
            made.push(abs);
          }
        });
        var errs = made.filter(function (m) { return m.indexOf('ошибка') === 0; });
        return { out: errs, err: errs.length > 0, cwd: state.cwd };
      }

      case 'touch': {
        if (!args.length) return fail('укажи имя файла');
        args.forEach(function (a) {
          var abs = absPath(a);
          if (nodeAt(abs)) return;
          var info = parentOf(abs);
          if (info.parent && info.parent.type === 'dir') info.parent.children[info.name] = file('');
        });
        return { out: [], cwd: state.cwd };
      }

      case 'cat': {
        if (!args.length) return fail('укажи файл');
        var lines2 = [];
        args.forEach(function (a) {
          var files = globExpand(a);
          files.forEach(function (p) {
            var node = nodeAt(p);
            if (!node) lines2.push('cat: нет файла ' + a);
            else if (node.type === 'dir') lines2.push('cat: «' + displayName(p) + '» — это папка');
            else String(node.content || '').replace(/\n$/, '').split('\n').forEach(function (l) { lines2.push(l); });
          });
        });
        return { out: lines2, cwd: state.cwd };
      }

      case 'echo': {
        var redirIdx = tokens.findIndex(function (t) { return t === '>' || t === '>>'; });
        if (redirIdx >= 0) {
          var text = tokens.slice(0, redirIdx).join(' ');
          var mode = tokens[redirIdx];
          var targetPath = tokens[redirIdx + 1];
          if (!targetPath) return fail('после ' + mode + ' нужно имя файла');
          var abs2 = absPath(targetPath);
          var info2 = parentOf(abs2);
          if (!info2.parent || info2.parent.type !== 'dir') return fail('нет папки для файла ' + targetPath);
          var existing = info2.parent.children[info2.name];
          if (existing && existing.type === 'dir') return fail(targetPath + ' — это папка');
          var newContent = text + '\n';
          if (mode === '>>' && existing) newContent = (existing.content || '') + text + '\n';
          info2.parent.children[info2.name] = file(newContent, existing ? existing.mode : '644');
          return { out: [], cwd: state.cwd };
        }
        return { out: [tokens.join(' ')], cwd: state.cwd };
      }

      case 'cp': case 'mv': {
        if (args.length < 2) return fail('нужно два аргумента: откуда и куда');
        var srcs = globExpand(args[0]);
        var dstAbs = absPath(args[1]);
        var dstNode = nodeAt(dstAbs);
        if (!srcs.length) return fail('нет файла ' + args[0]);
        srcs.forEach(function (src) {
          var node = nodeAt(src);
          if (!node) return;
          var targetPath;
          if (dstNode && dstNode.type === 'dir') targetPath = dstAbs + '/' + displayName(src);
          else targetPath = dstAbs;
          var ti = parentOf(targetPath);
          if (!ti.parent || ti.parent.type !== 'dir') return;
          ti.parent.children[ti.name] = JSON.parse(JSON.stringify(node));
          if (cmd === 'mv') {
            var si = parentOf(src);
            if (si.parent) delete si.parent.children[si.name];
          }
        });
        return { out: [], cwd: state.cwd };
      }

      case 'rm': {
        if (!args.length) return fail('укажи, что удалить');
        var problems = [];
        args.forEach(function (a) {
          globExpand(a).forEach(function (p) {
            var node = nodeAt(p);
            if (!node) { problems.push('rm: нет файла ' + a); return; }
            if (node.type === 'dir' && !hasFlag('r')) { problems.push('rm: «' + displayName(p) + '» — папка, нужен флаг -r'); return; }
            var info3 = parentOf(p);
            if (info3.parent) delete info3.parent.children[info3.name];
          });
        });
        return { out: problems, err: problems.length > 0, cwd: state.cwd };
      }

      case 'grep': {
        var pattern = args.shift();
        if (!pattern) return fail('укажи слово для поиска');
        var roots = args.length ? args : ['.'];
        var lines3 = [];
        function scan(p, nameForOutput) {
          var node = nodeAt(p);
          if (!node) return;
          if (node.type === 'file') {
            String(node.content || '').split('\n').forEach(function (l) {
              if (l.toLowerCase().indexOf(String(pattern).toLowerCase()) >= 0) {
                lines3.push((nameForOutput || p) + ': ' + l);
              }
            });
            return;
          }
          if (!hasFlag('r') && p !== '.' && roots.indexOf('.') < 0) return;
          Object.keys(node.children).sort().forEach(function (n) {
            scan(p + '/' + n, nameForOutput);
          });
        }
        roots.forEach(function (r) {
          globExpand(r).forEach(function (p) {
            scan(p, absPath(p).replace(HOME + '/', ''));
          });
        });
        return { out: lines3, cwd: state.cwd };
      }

      case 'wc': {
        if (!args.length) return fail('укажи файл');
        var lines4 = [];
        args.forEach(function (a) {
          globExpand(a).forEach(function (p) {
            var node = nodeAt(p);
            if (!node || node.type !== 'file') { lines4.push('wc: нет файла ' + a); return; }
            var text = String(node.content || '');
            if (hasFlag('l')) {
              var n = text.length ? text.replace(/\n$/, '').split('\n').length : 0;
              lines4.push(n + ' ' + displayName(p));
            } else {
              var nl = text.length ? text.replace(/\n$/, '').split('\n').length : 0;
              lines4.push(nl + ' ' + text.split(/\s+/).filter(Boolean).length + ' ' + text.length + ' ' + displayName(p));
            }
          });
        });
        return { out: lines4, cwd: state.cwd };
      }

      case 'head': case 'tail': {
        var count = 10;
        var nIdx = flags.findIndex(function (f) { return /^-\d+$/.test(f); });
        if (nIdx >= 0) count = parseInt(flags[nIdx].slice(1), 10);
        var nFlag = flags.indexOf('-n');
        if (nFlag >= 0 && args.length && /^\d+$/.test(args[0])) count = parseInt(args.shift(), 10);
        var filesT = args.length ? args : [];
        var lines5 = [];
        filesT.forEach(function (a) {
          var node = nodeAt(a);
          if (!node || node.type !== 'file') { lines5.push('нет файла ' + a); return; }
          var ls = String(node.content || '').replace(/\n$/, '').split('\n');
          (cmd === 'head' ? ls.slice(0, count) : ls.slice(-count)).forEach(function (l) { lines5.push(l); });
        });
        return { out: lines5, cwd: state.cwd };
      }

      case 'chmod': {
        var mode2 = args.shift();
        if (!mode2 || !/^[0-7]{3}$/.test(mode2)) return fail('режим должен быть из трёх цифр, например 600');
        if (!args.length) return fail('укажи файл');
        var errs2 = [];
        args.forEach(function (a) {
          globExpand(a).forEach(function (p) {
            var node = nodeAt(p);
            if (!node) { errs2.push('chmod: нет файла ' + a); return; }
            node.mode = mode2;
          });
        });
        return { out: errs2, err: errs2.length > 0, cwd: state.cwd };
      }

      default:
        return { out: ['команда не найдена: ' + cmd + '   (help — список команд)'], err: true, cwd: state.cwd };
    }
  }

  /* -------------------------------- интерфейс -------------------------------- */
  var consoleEl, inputEl, promptEl, filesEl;

  function printLine(text, cls) {
    var div = document.createElement('div');
    if (cls) div.className = cls;
    div.textContent = text;
    consoleEl.appendChild(div);
  }
  function printBlock(text, cls) {
    String(text).split('\n').forEach(function (l) { printLine(l, cls); });
  }
  function refreshFiles() {
    var node = nodeAt(state.cwd);
    var names = node && node.children ? Object.keys(node.children).sort() : [];
    filesEl.textContent = state.cwd + '  →  ' + (names.length ? names.join('   ') : '(пусто)');
    promptEl.textContent = state.cwd.replace(HOME, '~') + ' $';
  }

  function execute(line) {
    if (!line.trim()) return;
    printLine((state.cwd.replace(HOME, '~')) + ' $ ' + line, 'cmd');
    state.history.push(line);
    var res = run(line);
    if (res.clear) { consoleEl.innerHTML = ''; return; }
    if (res.out && res.out.length) printBlock(res.out.join('\n'), res.err ? 'err' : null);
    state.cwd = res.cwd;
    refreshFiles();
  }

  function resetFS() {
    state.fs = freshFS();
    state.cwd = HOME;
    state.history = [];
    consoleEl.innerHTML = '';
    printBlock('Виртуальный терминал IT-квантума. Всё в памяти браузера — сломать настоящую систему нельзя.\n' +
      'Набери help и нажми Enter, чтобы увидеть команды.', 'dim');
    refreshFiles();
  }

  /* ------------------------------ публичный API ------------------------------ */
  window.TermAPI = {
    lookup: function (p) { return nodeAt(p); },
    read: function (p) {
      var n = nodeAt(p);
      return n && n.type === 'file' ? String(n.content || '') : '';
    },
    mode: function (p) {
      var n = nodeAt(p);
      return n ? n.mode : null;
    },
    cwd: function () { return state.cwd; },
    exec: execute
  };

  /* --------------------------------- запуск --------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    consoleEl = document.getElementById('terminalOut');
    inputEl = document.getElementById('terminalInput');
    promptEl = document.getElementById('ps1');
    filesEl = document.getElementById('filesHere');

    inputEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var line = inputEl.value;
      inputEl.value = '';
      execute(line);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    });

    document.getElementById('btnClearTerm').addEventListener('click', function () {
      consoleEl.innerHTML = '';
    });
    document.getElementById('btnResetFS').addEventListener('click', function () {
      if (confirm('Вернуть файлы в исходное состояние?')) resetFS();
    });
    document.getElementById('btnHelp').addEventListener('click', function () {
      execute('help');
    });

    window.Shell.init({
      storageKey: 'term.v1',
      productTitle: 'Тренажёр терминала Linux',
      productSubtitle: 'виртуальная файловая система в браузере',
      tasks: window.TERM_TASKS,
      open: function () { resetFS(); inputEl.focus(); },
      check: function (task) {
        return task.checks.map(function (c) {
          var ok = false;
          try { ok = !!c.fn(); } catch (e) { ok = false; }
          return { ok: ok, label: c.label, note: ok ? '' : (c.note || '') };
        });
      }
    });

    // для автотестов
    window.__term = {
      exec: execute,
      solve: function (i) {
        window.TERM_TASKS[i].solution.forEach(function (cmd) { execute(cmd); });
        return window.TERM_TASKS[i].checks.map(function (c) { return { label: c.label, ok: !!c.fn() }; });
      },
      state: state
    };
    window.__solve = function (i) {
      if (window.Shell && window.Shell.openTask) window.Shell.openTask(i);
      return window.TERM_TASKS[i].solution.forEach(function (cmd) { execute(cmd); });
    };
  });
})();
