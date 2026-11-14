/* ==========================================================================
   PyTrainer — компактный интерпретатор подмножества Python 3 на JavaScript.
   Работает целиком в браузере, без сети и без Pyodide.
   Поддержка: переменные, арифметика, строки, f-строки, списки, словари,
   условия, while, for, def/return, break/continue, срезы, методы str/list/dict,
   встроенные функции, модули math и random, print(input) и stdin.
   ========================================================================== */
(function (global) {
  'use strict';

  var KEYWORDS = ['and','or','not','if','elif','else','while','for','in','def','return',
    'True','False','None','break','continue','pass','import','from','as','global','lambda'];

  function pyErr(msg, line, kind) {
    var e = new Error(msg);
    e.isPy = true;
    e.line = line || null;
    e.kind = kind || 'Ошибка';
    return e;
  }
  function F(v) { this.v = v; }                 // float-обёртка: отличает 2.0 от 2
  function isF(v) { return v instanceof F; }
  function isNum(v) { return typeof v === 'number' || v instanceof F; }
  function S(items) {                    // множество: Map «значение -> true»
    this.m = new Map();
    var self = this;
    (items || []).forEach(function (v) { self.add(v); });
  }
  S.prototype.add = function (v) {
    var k = hashKey(v);
    this.m.set(k, v);
    return this;
  };
  S.prototype.has = function (v) { return this.m.has(hashKey(v)); };
  S.prototype.delete = function (v) { return this.m.delete(hashKey(v)); };
  S.prototype.size = function () { return this.m.size; };
  S.prototype.values = function () { var r = []; this.m.forEach(function (v) { r.push(v); }); return r; };
  function hashKey(v) {
    if (Array.isArray(v) || v instanceof Map || v instanceof S) {
      throw pyErr('список нельзя положить в множество (unhashable)', null, 'TypeError');
    }
    if (isNum(v)) return 'n:' + num(v);
    if (typeof v === 'string') return 's:' + v;
    if (typeof v === 'boolean') return 'n:' + (v ? 1 : 0);
    return 'x:' + String(v);
  }
  function num(v) { return v instanceof F ? v.v : v; }
  function mkNum(n, asFloat) { return asFloat ? new F(n) : n; }
  function pyRound(x) {
    var fl = Math.floor(x), d = x - fl;
    if (d > 0.5) return fl + 1;
    if (d < 0.5) return fl;
    return fl % 2 === 0 ? fl : fl + 1;
  }

  function nameErr(name, line) { return pyErr('имя «' + name + '» не определено', line, 'NameError'); }
  function typeErr(op, l, r, line) {
    return pyErr('нельзя применить «' + op + '» к ' + typeName(l) + ' и ' + typeName(r), line, 'TypeError');
  }
  function typeName(v) {
    if (v === null || v === undefined) return 'None';
    if (v instanceof F) return 'float';
    if (v instanceof S) return 'set';
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
    if (typeof v === 'string') return 'str';
    if (Array.isArray(v)) return 'list';
    if (v instanceof Map) return 'dict';
    if (typeof v === 'function') return 'function';
    return typeof v;
  }

  /* ============================ ЛЕКСЕР ============================ */

  var OPS = ['**=','//=','>>=','<<=','...','**','//','==','!=','<=','>=','+=','-=','*=','/=',
    '%=','&=','|=','^=','->',':=','<<','>>','+','-','*','/','%','<','>','=','(',')','[',']',
    '{','}',',',':','.',';','@','&','|','^','~'];

  function tokenize(src) {
    var toks = [], i = 0, line = 1, depth = 0, n = src.length;
    var indents = [0], atLineStart = true;

    function push(type, value, ln) { toks.push({ type: type, value: value, line: ln }); }

    while (i < n) {
      if (atLineStart && depth === 0) {
        var j = i, indent = 0;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) { indent += src[j] === '\t' ? 4 : 1; j++; }
        if (j >= n) { i = j; break; }
        if (src[j] === '\n') { i = j + 1; line++; continue; }
        if (src[j] === '#') { while (j < n && src[j] !== '\n') j++; i = j + 1; line++; continue; }
        if (indent > indents[indents.length - 1]) { indents.push(indent); push('INDENT', '', line); }
        else {
          while (indent < indents[indents.length - 1]) { indents.pop(); push('DEDENT', '', line); }
          if (indent !== indents[indents.length - 1]) throw pyErr('неверный отступ', line, 'IndentationError');
        }
        i = j; atLineStart = false;
        continue;
      }

      var c = src[i];
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '\\' && src[i + 1] === '\n') { i += 2; line++; continue; }
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '\n') {
        if (depth === 0) { push('NEWLINE', '', line); line++; i++; atLineStart = true; }
        else { line++; i++; }
        continue;
      }

      // строка (возможно, с префиксом f/r)
      var strPrefix = '';
      var mName = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(src.slice(i));
      if (mName) {
        var word = mName[0];
        var after = src[i + word.length];
        if ((after === '"' || after === "'") && /^(f|r|b|fr|rf|F|R|B|FR|RF)$/.test(word)) {
          strPrefix = word.toLowerCase(); i += word.length;
          c = src[i];
        } else {
          i += word.length;
          push('NAME', word, line);
          continue;
        }
      }

      // строка
      if (c === '"' || c === "'") {
        var quote = c, triple = src.substr(i, 3) === quote + quote + quote;
        i += triple ? 3 : 1;
        var out = '', closed = false;
        while (i < n) {
          if (src.substr(i, 3) === quote + quote + quote && triple) { i += 3; closed = true; break; }
          if (!triple && src[i] === quote) { i++; closed = true; break; }
          if (src[i] === '\\') {
            var esc = src[i + 1];
            if (esc === 'n') out += '\n';
            else if (esc === 't') out += '\t';
            else if (esc === '\\') out += '\\';
            else if (esc === quote) out += quote;
            else if (esc === '"') out += '"';
            else if (esc === "'") out += "'";
            else if (esc === '0') out += '\0';
            else out += '\\' + (esc === undefined ? '' : esc);
            i += 2;
            continue;
          }
          if (src[i] === '\n') { line++; out += '\n'; i++; continue; }
          out += src[i]; i++;
        }
        if (!closed) throw pyErr('не закрыта кавычка', line, 'SyntaxError');
        push(strPrefix.indexOf('f') >= 0 ? 'FSTR' : 'STR', out, line);
        continue;
      }

      // число
      var mNum = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (mNum) {
        var raw = mNum[0], val = Number(raw);
        if (Number.isNaN(val)) throw pyErr('некорректное число «' + raw + '»', line, 'SyntaxError');
        i += raw.length;
        toks.push({ type: 'NUM', value: val, line: line, isFloat: /[.eE]/.test(raw) });
        continue;
      }

      // оператор
      var matched = null;
      for (var k = 0; k < OPS.length; k++) {
        var op = OPS[k];
        if (src.substr(i, op.length) === op) { matched = op; break; }
      }
      if (matched) {
        if (matched === '(' || matched === '[' || matched === '{') depth++;
        if (matched === ')' || matched === ']' || matched === '}') depth = Math.max(0, depth - 1);
        i += matched.length;
        var t = (KEYWORDS.indexOf(matched) >= 0) ? 'NAME' : 'OP';
        push(t, matched, line);
        continue;
      }

      throw pyErr('непонятный символ «' + c + '»', line, 'SyntaxError');
    }

    if (toks.length && toks[toks.length - 1].type !== 'NEWLINE') push('NEWLINE', '', line);
    while (indents.length > 1) { indents.pop(); push('DEDENT', '', line); }
    push('EOF', '', line);
    return toks;
  }

  /* ============================ ПАРСЕР ============================ */

  function Parser(toks) { this.toks = toks; this.pos = 0; }

  Parser.prototype.peek = function (k) {
    return this.toks[this.pos + (k || 0)] || { type: 'EOF', value: '', line: this.lastLine() };
  };
  Parser.prototype.lastLine = function () { return this.toks.length ? this.toks[this.toks.length - 1].line : 1; };
  Parser.prototype.next = function () { return this.toks[this.pos++]; };
  Parser.prototype.at = function (type, value) {
    var t = this.peek();
    return t.type === type && (value === undefined || t.value === value);
  };
  Parser.prototype.atKw = function (kw) { var t = this.peek(); return t.type === 'NAME' && t.value === kw; };
  Parser.prototype.atOp = function (op) { var t = this.peek(); return t.type === 'OP' && t.value === op; };
  Parser.prototype.eat = function (type, value) { return this.at(type, value) ? this.next() : null; };
  Parser.prototype.expect = function (type, value, msg) {
    if (this.at(type, value)) return this.next();
    var t = this.peek();
    throw pyErr(msg || ('ожидалось «' + (value || type) + '», а получено «' + (t.value || t.type) + '»'), t.line, 'SyntaxError');
  };
  Parser.prototype.eof = function () { return this.peek().type === 'EOF'; };

  Parser.prototype.parseModule = function () {
    var stmts = [];
    while (!this.eof()) {
      while (this.at('NEWLINE')) this.next();
      if (this.eof()) break;
      var s = this.parseStatement();
      if (s) stmts.push(s);
    }
    return { type: 'Module', body: stmts };
  };

  Parser.prototype.parseExprOnly = function () {
    while (this.at('NEWLINE')) this.next();
    var e = this.parseExprList();
    while (this.at('NEWLINE')) this.next();
    if (!this.eof()) {
      var t = this.peek();
      throw pyErr('лишний текст в выражении: «' + (t.value || t.type) + '»', t.line, 'SyntaxError');
    }
    return e;
  };

  Parser.prototype.parseStatement = function () {
    var t = this.peek();
    if (t.type === 'NAME') {
      switch (t.value) {
        case 'if': return this.parseIf();
        case 'while': return this.parseWhile();
        case 'for': return this.parseFor();
        case 'def': return this.parseDef();
        case 'return': {
          this.next();
          var v = null;
          if (!this.at('NEWLINE') && !this.at('EOF') && !this.at('DEDENT')) v = this.parseExprList();
          this.endSimple();
          return { type: 'Return', value: v, line: t.line };
        }
        case 'break': this.next(); this.endSimple(); return { type: 'Break', line: t.line };
        case 'continue': this.next(); this.endSimple(); return { type: 'Continue', line: t.line };
        case 'pass': this.next(); this.endSimple(); return { type: 'Pass', line: t.line };
        case 'import': return this.parseImport();
        case 'from': return this.parseFromImport();
        case 'global': {
          this.next();
          var names = [];
          while (this.at('NAME')) { names.push(this.next().value); this.eat('OP', ','); }
          this.endSimple();
          return { type: 'Global', names: names, line: t.line };
        }
        case 'elif': case 'else':
          throw pyErr('«' + t.value + '» без предшествующего «if»', t.line, 'SyntaxError');
      }
    }
    return this.parseSimpleStatement();
  };

  Parser.prototype.endSimple = function () { this.eat('NEWLINE'); };

  Parser.prototype.parseBlock = function () {
    if (this.at('NEWLINE')) {
      this.next();
      this.expect('INDENT', undefined, 'после «:» ожидается блок с отступом');
      var stmts = [];
      while (!this.at('DEDENT') && !this.eof()) {
        while (this.at('NEWLINE')) this.next();
        if (this.at('DEDENT') || this.eof()) break;
        stmts.push(this.parseStatement());
      }
      this.eat('DEDENT');
      return stmts;
    }
    // блок в одну строку: if x: y
    return [this.parseStatement()];
  };

  Parser.prototype.parseIf = function () {
    var line = this.peek().line, tests = [], orelse = null;
    this.next(); // if
    var cond = this.parseExprList();
    this.expect('OP', ':', 'после условия нужно «:»');
    var body = this.parseBlock();
    tests.push({ cond: cond, body: body });
    while (this.atKw('elif')) {
      this.next();
      var c2 = this.parseExprList();
      this.expect('OP', ':', 'после условия нужно «:»');
      tests.push({ cond: c2, body: this.parseBlock() });
    }
    if (this.atKw('else')) {
      this.next();
      this.expect('OP', ':', 'после «else» нужно «:»');
      orelse = this.parseBlock();
    }
    return { type: 'If', tests: tests, orelse: orelse, line: line };
  };

  Parser.prototype.parseWhile = function () {
    var line = this.peek().line;
    this.next();
    var cond = this.parseExprList();
    this.expect('OP', ':', 'после условия нужно «:»');
    var body = this.parseBlock();
    var orelse = null;
    if (this.atKw('else')) { this.next(); this.expect('OP', ':'); orelse = this.parseBlock(); }
    return { type: 'While', cond: cond, body: body, orelse: orelse, line: line };
  };

  Parser.prototype.parseFor = function () {
    var line = this.peek().line;
    this.next();
    var target = this.parseForTarget();
    if (!this.atKw('in')) throw pyErr('в «for» ожидается «in»', line, 'SyntaxError');
    this.next();
    var iter = this.parseExprList();
    this.expect('OP', ':', 'после «for ... in ...» нужно «:»');
    var body = this.parseBlock();
    var orelse = null;
    if (this.atKw('else')) { this.next(); this.expect('OP', ':'); orelse = this.parseBlock(); }
    return { type: 'For', target: target, iter: iter, body: body, orelse: orelse, line: line };
  };

  Parser.prototype.parseDef = function () {
    var line = this.peek().line;
    this.next();
    var nameTok = this.expect('NAME', undefined, 'после «def» нужно имя функции');
    this.expect('OP', '(', 'после имени функции нужно «(»');
    var params = [], defaults = [];
    while (!this.atOp(')')) {
      var p = this.expect('NAME', undefined, 'ожидается имя параметра');
      var def = null;
      if (this.eat('OP', '=')) def = this.parseExpr();
      params.push(p.value);
      defaults.push(def);
      if (!this.atOp(')')) this.expect('OP', ',');
    }
    this.expect('OP', ')');
    this.expect('OP', ':', 'после параметров функции нужно «:»');
    var body = this.parseBlock();
    return { type: 'FuncDef', name: nameTok.value, params: params, defaults: defaults, body: body, line: line };
  };

  Parser.prototype.parseImport = function () {
    var line = this.peek().line;
    this.next();
    var mod = this.expect('NAME', undefined, 'ожидается имя модуля');
    var as = mod.value;
    if (this.atKw('as')) { this.next(); as = this.expect('NAME').value; }
    this.endSimple();
    return { type: 'Import', mod: mod.value, as: as, line: line };
  };

  Parser.prototype.parseFromImport = function () {
    var line = this.peek().line;
    this.next();
    var mod = this.expect('NAME', undefined, 'ожидается имя модуля');
    if (!this.atKw('import')) throw pyErr('ожидается «import»', line, 'SyntaxError');
    this.next();
    var names = [];
    while (this.at('NAME')) {
      var nm = this.next().value, as = nm;
      if (this.atKw('as')) { this.next(); as = this.expect('NAME').value; }
      names.push({ name: nm, as: as });
      if (!this.eat('OP', ',')) break;
    }
    this.endSimple();
    return { type: 'FromImport', mod: mod.value, names: names, line: line };
  };

  Parser.prototype.parseSimpleStatement = function () {
    var line = this.peek().line;
    var first = this.parseExprList();
    if (this.atOp('=')) {
      var targets = [first];
      var value = null;
      while (this.eat('OP', '=')) {
        value = this.parseExprList();
        if (this.atOp('=')) targets.push(value);
      }
      this.endSimple();
      return { type: 'Assign', targets: targets, value: value, line: line };
    }
    var augOps = ['+=','-=','*=','/=','//=','%=','**='];
    var t = this.peek();
    if (t.type === 'OP' && augOps.indexOf(t.value) >= 0) {
      this.next();
      var rhs = this.parseExprList();
      this.endSimple();
      return { type: 'Aug', target: first, op: t.value.slice(0, -1), value: rhs, line: line };
    }
    this.endSimple();
    return { type: 'Expr', value: first, line: line };
  };

  // цель цикла for: имя, кортеж имён, элемент списка/словаря
  Parser.prototype.parseForTarget = function () {
    var line = this.peek().line;
    var items = [this.parseForTargetItem()];
    while (this.atOp(',')) {
      this.next();
      if (this.atKw('in')) break;
      items.push(this.parseForTargetItem());
    }
    return items.length === 1 ? items[0] : { type: 'Tuple', items: items, line: line };
  };

  Parser.prototype.parseForTargetItem = function () {
    var t = this.peek();
    if (t.type === 'OP' && (t.value === '(' || t.value === '[')) {
      var close = t.value === '(' ? ')' : ']';
      this.next();
      var items = [];
      while (!this.atOp(close)) {
        items.push(this.parseForTargetItem());
        if (!this.atOp(close)) this.expect('OP', ',');
      }
      this.expect('OP', close);
      return { type: 'Tuple', items: items, line: t.line };
    }
    if (t.type === 'NAME') {
      this.next();
      var node = { type: 'Name', id: t.value, line: t.line };
      for (;;) {
        if (this.atOp('.')) {
          this.next();
          var a = this.expect('NAME');
          node = { type: 'Attr', obj: node, name: a.value, line: t.line };
        } else if (this.atOp('[')) {
          this.next();
          var idx = this.parseExprList();
          this.expect('OP', ']');
          node = { type: 'Sub', obj: node, idx: idx, line: t.line };
        } else break;
      }
      return node;
    }
    throw pyErr('в «for» слева от «in» должна быть переменная', t.line, 'SyntaxError');
  };

  // список целей присваивания: a, b или (a, b)
  Parser.prototype.parseTargetList = function () {
    var line = this.peek().line;
    var items = [this.parseExpr()];
    while (this.atOp(',')) {
      this.next();
      if (this.atKw('in') || this.atOp('=') || this.atOp(':')) break;
      items.push(this.parseExpr());
    }
    if (items.length === 1) return items[0];
    return { type: 'Tuple', items: items, line: line };
  };

  Parser.prototype.parseExprList = function () {
    var line = this.peek().line;
    var first = this.parseExpr();
    if (!this.atOp(',')) return first;
    var items = [first];
    while (this.eat('OP', ',')) {
      if (this.at('NEWLINE') || this.atOp('=') || this.atOp(')') || this.atOp(']') || this.eof()) break;
      items.push(this.parseExpr());
    }
    return { type: 'Tuple', items: items, line: line };
  };

  Parser.prototype.parseExpr = function () {
    var line = this.peek().line;
    var v = this.parseOr();
    if (this.atKw('if')) {
      this.next();
      var cond = this.parseOr();
      if (!this.atKw('else')) throw pyErr('в условном выражении нужно «else»', line, 'SyntaxError');
      this.next();
      var other = this.parseExpr();
      return { type: 'IfExp', cond: cond, a: v, b: other, line: line };
    }
    return v;
  };

  Parser.prototype.parseOr = function () {
    var line = this.peek().line;
    var items = [this.parseAnd()];
    while (this.atKw('or')) { this.next(); items.push(this.parseAnd()); }
    return items.length === 1 ? items[0] : { type: 'Bool', op: 'or', items: items, line: line };
  };

  Parser.prototype.parseAnd = function () {
    var line = this.peek().line;
    var items = [this.parseNot()];
    while (this.atKw('and')) { this.next(); items.push(this.parseNot()); }
    return items.length === 1 ? items[0] : { type: 'Bool', op: 'and', items: items, line: line };
  };

  Parser.prototype.parseNot = function () {
    var line = this.peek().line;
    if (this.atKw('not')) { this.next(); return { type: 'Un', op: 'not', value: this.parseNot(), line: line }; }
    return this.parseComparison();
  };

  Parser.prototype.parseBitOr = function () {
    var line = this.peek().line;
    var left = this.parseBitAnd();
    while (this.atOp('|')) {
      this.next();
      left = { type: 'Bin', op: '|', l: left, r: this.parseBitAnd(), line: line };
    }
    return left;
  };

  Parser.prototype.parseBitAnd = function () {
    var line = this.peek().line;
    var left = this.parseArith();
    while (this.atOp('&')) {
      this.next();
      left = { type: 'Bin', op: '&', l: left, r: this.parseArith(), line: line };
    }
    return left;
  };

  Parser.prototype.parseComparison = function () {
    var line = this.peek().line;
    var left = this.parseBitOr();
    var ops = [], operands = [left];
    for (;;) {
      var t = this.peek();
      if (t.type === 'OP' && ['==','!=','<','>','<=','>='].indexOf(t.value) >= 0) {
        this.next(); ops.push(t.value); operands.push(this.parseBitOr());
      } else if (this.atKw('in')) {
        this.next(); ops.push('in'); operands.push(this.parseBitOr());
      } else if (this.atKw('not') && this.peek(1).type === 'NAME' && this.peek(1).value === 'in') {
        this.next(); this.next(); ops.push('not in'); operands.push(this.parseBitOr());
      } else break;
    }
    if (!ops.length) return left;
    return { type: 'Cmp', ops: ops, operands: operands, line: line };
  };

  Parser.prototype.parseArith = function () {
    var line = this.peek().line;
    var left = this.parseTerm();
    while (this.atOp('+') || this.atOp('-')) {
      var op = this.next().value;
      var right = this.parseTerm();
      left = { type: 'Bin', op: op, l: left, r: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseTerm = function () {
    var line = this.peek().line;
    var left = this.parseFactor();
    while (this.atOp('*') || this.atOp('/') || this.atOp('//') || this.atOp('%')) {
      var op = this.next().value;
      var right = this.parseFactor();
      left = { type: 'Bin', op: op, l: left, r: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseFactor = function () {
    var line = this.peek().line;
    if (this.atOp('-')) { this.next(); return { type: 'Un', op: '-', value: this.parseFactor(), line: line }; }
    if (this.atOp('+')) { this.next(); return this.parseFactor(); }
    return this.parsePower();
  };

  Parser.prototype.parsePower = function () {
    var line = this.peek().line;
    var base = this.parsePostfix();
    if (this.atOp('**')) {
      this.next();
      return { type: 'Bin', op: '**', l: base, r: this.parseFactor(), line: line };
    }
    return base;
  };

  Parser.prototype.parsePostfix = function () {
    var node = this.parseAtom();
    for (;;) {
      if (this.atOp('(')) {
        this.next();
        var args = [], kwargs = [];
        while (!this.atOp(')')) {
          if (this.at('NAME') && this.peek(1).type === 'OP' && this.peek(1).value === '=') {
            var kwName = this.next().value;
            this.next();
            kwargs.push({ name: kwName, value: this.parseExpr() });
          } else {
            var argExpr = this.parseExpr();
            if (this.atKw('for')) argExpr = this.parseCompClauses(argExpr, node.line);
            args.push(argExpr);
          }
          if (!this.atOp(')')) this.expect('OP', ',');
        }
        this.expect('OP', ')');
        node = { type: 'Call', fn: node, args: args, kwargs: kwargs, line: node.line };
      } else if (this.atOp('[')) {
        this.next();
        var idx = null, sliceNode = null;
        if (this.atOp(':')) {
          sliceNode = this.parseSliceRest(null);
        } else {
          idx = this.parseExprList();
          if (this.atOp(':')) sliceNode = this.parseSliceRest(idx);
        }
        this.expect('OP', ']');
        node = sliceNode ? { type: 'SliceExpr', obj: node, slice: sliceNode, line: node.line }
                         : { type: 'Sub', obj: node, idx: idx, line: node.line };
      } else if (this.atOp('.')) {
        this.next();
        var attr = this.expect('NAME', undefined, 'после «.» ожидается имя');
        node = { type: 'Attr', obj: node, name: attr.value, line: node.line };
      } else break;
    }
    return node;
  };

  Parser.prototype.parseSliceRest = function (start) {
    // уже стоим на ':'
    this.expect('OP', ':');
    var stop = null, step = null;
    if (!this.atOp(']') && !this.atOp(':')) stop = this.parseExpr();
    if (this.atOp(':')) { this.next(); if (!this.atOp(']')) step = this.parseExpr(); }
    return { start: start, stop: stop, step: step };
  };

  Parser.prototype.parseAtom = function () {
    var t = this.peek();
    if (t.type === 'NUM') { this.next(); return { type: 'Num', value: t.value, float: !!t.isFloat, line: t.line }; }
    if (t.type === 'STR') {
      var s = t.value;
      this.next();
      while (this.at('STR')) s += this.next().value; // склейка соседних строк
      return { type: 'Str', value: s, line: t.line };
    }
    if (t.type === 'FSTR') {
      this.next();
      return { type: 'FStr', parts: this.parseFString(t.value, t.line), line: t.line };
    }
    if (t.type === 'NAME') {
      if (t.value === 'True') { this.next(); return { type: 'Num', value: 1, bool: true, line: t.line }; }
      if (t.value === 'False') { this.next(); return { type: 'Num', value: 0, bool: true, line: t.line }; }
      if (t.value === 'None') { this.next(); return { type: 'Const', value: null, line: t.line }; }
      if (t.value === 'lambda') throw pyErr('lambda пока не поддерживается', t.line, 'SyntaxError');
      if (KEYWORDS.indexOf(t.value) >= 0 && ['and','or','not','if','else','in','for','def','return','while'].indexOf(t.value) >= 0) {
        throw pyErr('неожиданное слово «' + t.value + '»', t.line, 'SyntaxError');
      }
      this.next();
      return { type: 'Name', id: t.value, line: t.line };
    }
    if (t.type === 'OP' && t.value === '(') {
      this.next();
      if (this.atOp(')')) { this.next(); return { type: 'Tuple', items: [], line: t.line }; }
      var first = this.parseExpr();
      if (this.atOp(',')) {
        var items = [first];
        while (this.eat('OP', ',')) {
          if (this.atOp(')')) break;
          items.push(this.parseExpr());
        }
        this.expect('OP', ')');
        return { type: 'Tuple', items: items, line: t.line };
      }
      this.expect('OP', ')');
      return first;
    }
    if (t.type === 'OP' && t.value === '[') {
      this.next();
      if (this.atOp(']')) { this.next(); return { type: 'List', items: [], line: t.line }; }
      var firstItem = this.parseExpr();
      if (this.atKw('for')) return this.parseComp(firstItem, t.line);
      var li = [firstItem];
      while (!this.atOp(']')) {
        this.expect('OP', ',');
        if (this.atOp(']')) break;
        li.push(this.parseExpr());
      }
      this.expect('OP', ']');
      return { type: 'List', items: li, line: t.line };
    }
    if (t.type === 'OP' && t.value === '{') {
      this.next();
      if (this.atOp('}')) { this.next(); return { type: 'Dict', keys: [], values: [], line: t.line }; }
      var firstKey = this.parseExpr();
      if (this.atOp(':')) {
        var keys = [firstKey], vals = [];
        this.next();
        vals.push(this.parseExpr());
        while (this.eat('OP', ',')) {
          if (this.atOp('}')) break;
          keys.push(this.parseExpr());
          this.expect('OP', ':', 'в словаре нужно «:» после ключа');
          vals.push(this.parseExpr());
        }
        this.expect('OP', '}');
        return { type: 'Dict', keys: keys, values: vals, line: t.line };
      }
      var setItems = [firstKey];
      while (this.eat('OP', ',')) {
        if (this.atOp('}')) break;
        setItems.push(this.parseExpr());
      }
      this.expect('OP', '}');
      return { type: 'SetLit', items: setItems, line: t.line };
    }
    throw pyErr('неожидаемый символ «' + (t.value || t.type) + '»', t.line, 'SyntaxError');
  };

  Parser.prototype.parseCompClauses = function (elt, line) {
    var clauses = [];
    while (this.atKw('for')) {
      this.next();
      var target = this.parseForTarget();
      if (!this.atKw('in')) throw pyErr('в генераторе ожидается «in»', line, 'SyntaxError');
      this.next();
      var iter = this.parseOr();
      var conds = [];
      while (this.atKw('if')) { this.next(); conds.push(this.parseOr()); }
      clauses.push({ target: target, iter: iter, conds: conds });
    }
    return { type: 'Comp', elt: elt, clauses: clauses, line: line };
  };

  Parser.prototype.parseComp = function (elt, line) {
    var node = this.parseCompClauses(elt, line);
    this.expect('OP', ']', 'не закрыта квадратная скобка в генераторе списка');
    return node;
  };

  Parser.prototype.parseFString = function (raw, line) {
    var parts = [], lit = '', i = 0;
    while (i < raw.length) {
      var c = raw[i];
      if (c === '{' && raw[i + 1] === '{') { lit += '{'; i += 2; continue; }
      if (c === '}' && raw[i + 1] === '}') { lit += '}'; i += 2; continue; }
      if (c === '{') {
        if (lit) { parts.push({ type: 'lit', value: lit }); lit = ''; }
        var depth = 1, j = i + 1, expr = '';
        while (j < raw.length) {
          var d = raw[j];
          if (d === '{' || d === '(' || d === '[') depth++;
          else if (d === '}' || d === ')' || d === ']') { depth--; if (depth === 0) break; }
          expr += d; j++;
        }
        if (depth !== 0) throw pyErr('не закрыта скобка в f-строке', line, 'SyntaxError');
        var spec = null, exprText = expr;
        var cut = splitSpec(expr);
        if (cut) { exprText = cut[0]; spec = cut[1]; }
        var sub = new Parser(tokenize(exprText)).parseExprOnly();
        parts.push({ type: 'expr', node: sub, spec: spec });
        i = j + 1;
        continue;
      }
      lit += c; i++;
    }
    if (lit) parts.push({ type: 'lit', value: lit });
    return parts;
  };

  function splitSpec(expr) {
    var depth = 0;
    for (var i = 0; i < expr.length; i++) {
      var c = expr[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ':' && depth === 0) return [expr.slice(0, i), expr.slice(i + 1)];
    }
    return null;
  }

  /* ============================ ЗНАЧЕНИЯ ============================ */

  function truthy(v) {
    if (v === null || v === undefined) return false;
    if (v instanceof F) return v.v !== 0;
    if (v instanceof S) return v.size() > 0;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v.length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (v instanceof Map) return v.size > 0;
    return true;
  }

  function fmtNum(n) {
    if (Number.isInteger(n)) return String(n);
    var s = String(n);
    return s;
  }

  function pyStr(v) {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (v instanceof F) return Number.isInteger(v.v) ? v.v.toFixed(1) : String(v.v);
    if (typeof v === 'number') return fmtNum(v);
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']';
    if (v instanceof S) {
      var items = v.values();
      if (!items.length) return 'set()';
      return '{' + items.map(pyRepr).join(', ') + '}';
    }
    if (v instanceof Map) {
      var s = '{', first = true;
      v.forEach(function (val, key) {
        if (!first) s += ', ';
        first = false;
        s += pyRepr(key) + ': ' + pyRepr(val);
      });
      return s + '}';
    }
    if (typeof v === 'function') return '<function ' + (v.pyName || '?') + '>';
    if (v && v.__module) return '<module ' + v.__name + '>';
    return String(v);
  }

  function pyRepr(v) {
    if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\t/g, '\\t') + "'";
    return pyStr(v);
  }

  function toList(v, line) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return v.split('');
    if (v instanceof S) return v.values();
    if (v instanceof Map) { var ks = []; v.forEach(function (_, k) { ks.push(k); }); return ks; }
    throw pyErr('объект ' + typeName(v) + ' не перебирается в цикле', line, 'TypeError');
  }

  function pyEq(a, b) {
    if (isNum(a) && isNum(b)) return num(a) === num(b);
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    if (typeof a === 'boolean' || typeof b === 'boolean') return a === b;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!pyEq(a[i], b[i])) return false;
      return true;
    }
    if (a instanceof S && b instanceof S) {
      if (a.size() !== b.size()) return false;
      var same = true;
      a.m.forEach(function (_, k) { if (!b.m.has(k)) same = false; });
      return same;
    }
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      var ok = true;
      a.forEach(function (v, k) { if (!b.has(k) || !pyEq(v, b.get(k))) ok = false; });
      return ok;
    }
    return a === b;
  }

  function pyCmp(a, b, line) {
    if ((isNum(a) && isNum(b)) ||
        (typeof a === 'string' && typeof b === 'string')) {
      var x = isNum(a) ? num(a) : a, y = isNum(b) ? num(b) : b;
      return x < y ? -1 : (x > y ? 1 : 0);
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      for (var i = 0; i < Math.min(a.length, b.length); i++) {
        var c = pyCmp(a[i], b[i], line);
        if (c !== 0) return c;
      }
      return a.length - b.length;
    }
    throw pyErr('нельзя сравнивать ' + typeName(a) + ' и ' + typeName(b), line, 'TypeError');
  }

  function contains(needle, haystack, line) {
    if (typeof haystack === 'string') return haystack.indexOf(pyStr(needle)) >= 0;
    if (Array.isArray(haystack)) {
      for (var i = 0; i < haystack.length; i++) if (pyEq(haystack[i], needle)) return true;
      return false;
    }
    if (haystack instanceof S) return haystack.has(needle);
    if (haystack instanceof Map) return haystack.has(needle);
    throw pyErr('операция «in» не работает с ' + typeName(haystack), line, 'TypeError');
  }

  function binop(op, l, r, line) {
    if (isNum(l) && isNum(r)) {
      var a = num(l), b = num(r), fl = isF(l) || isF(r);
      switch (op) {
        case '+': return mkNum(a + b, fl);
        case '-': return mkNum(a - b, fl);
        case '*': return mkNum(a * b, fl);
        case '/':
          if (b === 0) throw pyErr('деление на ноль', line, 'ZeroDivisionError');
          return new F(a / b);
        case '//':
          if (b === 0) throw pyErr('деление на ноль', line, 'ZeroDivisionError');
          return mkNum(Math.floor(a / b), fl);
        case '%':
          if (b === 0) throw pyErr('деление на ноль', line, 'ZeroDivisionError');
          return mkNum(((a % b) + b) % b, fl);
        case '**': return mkNum(Math.pow(a, b), fl);
      }
    }
    if (op === '+') {
      if (typeof l === 'string' && typeof r === 'string') return l + r;
      if (Array.isArray(l) && Array.isArray(r)) return l.concat(r);
    }
    if (op === '*') {
      if (typeof l === 'string' && isNum(r)) return l.repeat(Math.max(0, Math.floor(num(r))));
      if (isNum(l) && typeof r === 'string') return r.repeat(Math.max(0, Math.floor(num(l))));
      if (Array.isArray(l) && isNum(r)) {
        var out = [];
        for (var i = 0; i < Math.floor(num(r)); i++) out = out.concat(l);
        return out;
      }
      if (isNum(l) && Array.isArray(r)) {
        var out2 = [];
        for (var j = 0; j < Math.floor(num(l)); j++) out2 = out2.concat(r);
        return out2;
      }
    }
    if (l instanceof S && r instanceof S) {
      if (op === '|') { var u = new S(l.values()); r.m.forEach(function (v) { u.add(v); }); return u; }
      if (op === '&') { var it = new S(); l.m.forEach(function (v, k) { if (r.m.has(k)) it.add(v); }); return it; }
      if (op === '-') { var df = new S(); l.m.forEach(function (v, k) { if (!r.m.has(k)) df.add(v); }); return df; }
    }
    throw typeErr(op, l, r, line);
  }

  /* ============================ ИНТЕРПРЕТАТОР ============================ */

  function Scope(parent, isFunc) {
    this.vars = Object.create(null);
    this.isFunc = !!isFunc;
    this.globalNames = Object.create(null);
  }

  function ReturnSig(v) { this.v = v; }
  function BreakSig() {}
  function ContinueSig() {}

  function Interp(stdin, opts) {
    this.stdin = stdin || [];
    this.stdinPos = 0;
    this.lines = [];
    this.steps = 0;
    this.maxSteps = opts.maxSteps || 300000;
    this.wantTrace = !!opts.trace;
    this.trace = [];
    this.global = new Scope(null, false);
    this.outputTrace = 0;
  }

  Interp.prototype.get = function (name, scope, line) {
    if (name in scope.vars) return scope.vars[name];
    if (!scope.isFunc) {
      var b = this.builtins(name, line);
      if (b !== undefined) return b;
      throw nameErr(name, line);
    }
    if (name in this.global.vars) return this.global.vars[name];
    var bb = this.builtins(name, line);
    if (bb !== undefined) return bb;
    throw nameErr(name, line);
  };

  Interp.prototype.set = function (name, value, scope) {
    if (!scope.isFunc || scope.globalNames[name]) this.global.vars[name] = value;
    else scope.vars[name] = value;
  };

  Interp.prototype.tick = function (line) {
    this.steps++;
    if (this.steps > this.maxSteps) {
      throw pyErr('программа выполняется слишком долго — похоже на бесконечный цикл', line, 'TimeoutError');
    }
  };

  Interp.prototype.snapshot = function (scope) {
    var out = {}, self = this;
    function add(obj) {
      for (var k in obj) {
        if (k.indexOf('__') === 0) continue;
        var v = obj[k];
        if (typeof v === 'function' && v.pyName) continue;
        if (v && v.__module) continue;
        out[k] = pyRepr(v);
        if (out[k].length > 60) out[k] = out[k].slice(0, 57) + '…';
      }
    }
    add(this.global.vars);
    if (scope && scope.isFunc) add(scope.vars);
    return out;
  };

  Interp.prototype.record = function (line, scope) {
    if (!this.wantTrace) return;
    if (this.trace.length >= 400) return;
    this.trace.push({ line: line, vars: this.snapshot(scope) });
  };

  Interp.prototype.runModule = function (mod) {
    this.execBlock(mod.body, this.global);
  };

  Interp.prototype.execBlock = function (stmts, scope) {
    for (var i = 0; i < stmts.length; i++) this.execStmt(stmts[i], scope);
  };

  Interp.prototype.execStmt = function (s, scope) {
    this.tick(s.line);
    switch (s.type) {
      case 'Expr':
        this.eval(s.value, scope);
        this.record(s.line, scope);
        return;
      case 'Assign': {
        var val = this.eval(s.value, scope);
        for (var i = 0; i < s.targets.length; i++) this.assign(s.targets[i], val, scope);
        this.record(s.line, scope);
        return;
      }
      case 'Aug': {
        var cur = this.eval(s.target, scope);
        var rhs = this.eval(s.value, scope);
        var newVal = binop(s.op, cur, rhs, s.line);
        this.assign(s.target, newVal, scope);
        this.record(s.line, scope);
        return;
      }
      case 'If': {
        for (var t = 0; t < s.tests.length; t++) {
          if (truthy(this.eval(s.tests[t].cond, scope))) {
            this.execBlock(s.tests[t].body, scope);
            return;
          }
        }
        if (s.orelse) this.execBlock(s.orelse, scope);
        return;
      }
      case 'While': {
        while (truthy(this.eval(s.cond, scope))) {
          this.tick(s.line);
          try { this.execBlock(s.body, scope); }
          catch (e) {
            if (e instanceof BreakSig) { return; }
            if (e instanceof ContinueSig) { continue; }
            throw e;
          }
        }
        if (s.orelse) this.execBlock(s.orelse, scope);
        return;
      }
      case 'For': {
        var iterable = toList(this.eval(s.iter, scope), s.line);
        for (var k = 0; k < iterable.length; k++) {
          this.tick(s.line);
          this.assign(s.target, iterable[k], scope);
          this.record(s.line, scope);
          try { this.execBlock(s.body, scope); }
          catch (e) {
            if (e instanceof BreakSig) { return; }
            if (e instanceof ContinueSig) { continue; }
            throw e;
          }
        }
        if (s.orelse) this.execBlock(s.orelse, scope);
        return;
      }
      case 'FuncDef': {
        this.set(s.name, this.makeFunction(s, scope), scope);
        this.record(s.line, scope);
        return;
      }
      case 'Return':
        throw new ReturnSig(s.value ? this.eval(s.value, scope) : null);
      case 'Break': throw new BreakSig();
      case 'Continue': throw new ContinueSig();
      case 'Pass': return;
      case 'Global':
        for (var g = 0; g < s.names.length; g++) scope.globalNames[s.names[g]] = true;
        return;
      case 'Import': {
        var mod = this.module(s.mod, s.line);
        this.set(s.as, mod, scope);
        return;
      }
      case 'FromImport': {
        var m = this.module(s.mod, s.line);
        for (var q = 0; q < s.names.length; q++) {
          var nm = s.names[q].name;
          if (!(nm in m)) throw pyErr('в модуле ' + s.mod + ' нет «' + nm + '»', s.line, 'ImportError');
          this.set(s.names[q].as, m[nm], scope);
        }
        return;
      }
      default:
        throw pyErr('неизвестная конструкция: ' + s.type, s.line);
    }
  };

  Interp.prototype.assign = function (target, value, scope) {
    switch (target.type) {
      case 'Name':
        this.set(target.id, value, scope);
        return;
      case 'Tuple': case 'List': {
        var items = toList(value, target.line);
        if (items.length !== target.items.length) {
          throw pyErr('не совпадает число значений при распаковке: слева ' + target.items.length + ', справа ' + items.length, target.line, 'ValueError');
        }
        for (var i = 0; i < target.items.length; i++) this.assign(target.items[i], items[i], scope);
        return;
      }
      case 'Sub': {
        var obj = this.eval(target.obj, scope);
        var idx = this.eval(target.idx, scope);
        if (Array.isArray(obj)) {
          var ii = toIndex(idx, target.line);
          if (ii < 0) ii += obj.length;
          if (ii < 0 || ii >= obj.length) throw pyErr('индекс ' + idx + ' вне списка длиной ' + obj.length, target.line, 'IndexError');
          obj[ii] = value;
          return;
        }
        if (obj instanceof Map) { obj.set(idx, value); return; }
        throw pyErr('нельзя присвоить по индексу объекту ' + typeName(obj), target.line, 'TypeError');
      }
      case 'Attr':
        throw pyErr('присваивание атрибуту не поддерживается', target.line);
      default:
        throw pyErr('слева от «=» должна быть переменная', target.line, 'SyntaxError');
    }
  };

  function toIndex(v, line) {
    if (typeof v === 'number' && Number.isInteger(v)) return v;
    if (v instanceof F) throw pyErr('индекс должен быть целым числом, а не float', line, 'TypeError');
    if (typeof v === 'boolean') return v ? 1 : 0;
    throw pyErr('индекс должен быть целым числом, а не ' + typeName(v), line, 'TypeError');
  }

  Interp.prototype.makeFunction = function (node, defScope) {
    var self = this;
    function fn(args, kwargs) {
      var scope = new Scope(defScope, true);
      for (var i = 0; i < node.params.length; i++) {
        var name = node.params[i];
        if (i < args.length) scope.vars[name] = args[i];
        else if (node.defaults[i] !== null && node.defaults[i] !== undefined) scope.vars[name] = self.eval(node.defaults[i], defScope);
        else throw pyErr('функция ' + node.name + '() ждёт аргумент «' + name + '»', node.line, 'TypeError');
      }
      if (kwargs) for (var k = 0; k < kwargs.length; k++) scope.vars[kwargs[k].name] = kwargs[k].value;
      try {
        self.execBlock(node.body, scope);
      } catch (e) {
        if (e instanceof ReturnSig) return e.v;
        throw e;
      }
      return null;
    }
    fn.pyName = node.name;
    return fn;
  };

  Interp.prototype.eval = function (n, scope) {
    switch (n.type) {
      case 'Num': return n.bool ? !!n.value : (n.float ? new F(n.value) : n.value);
      case 'Const': return n.value;
      case 'Str': return n.value;
      case 'Name': return this.get(n.id, scope, n.line);
      case 'List': {
        var arr = [];
        for (var i = 0; i < n.items.length; i++) arr.push(this.eval(n.items[i], scope));
        return arr;
      }
      case 'Tuple': {
        var tarr = [];
        for (var j = 0; j < n.items.length; j++) tarr.push(this.eval(n.items[j], scope));
        return tarr;
      }
      case 'SetLit': {
        var setItems = new S();
        for (var si = 0; si < n.items.length; si++) setItems.add(this.eval(n.items[si], scope));
        return setItems;
      }
      case 'Dict': {
        var m = new Map();
        for (var d = 0; d < n.keys.length; d++) m.set(this.eval(n.keys[d], scope), this.eval(n.values[d], scope));
        return m;
      }
      case 'Comp': {
        var res = [], self2 = this;
        function walk(idx, sc) {
          if (idx === n.clauses.length) { res.push(self2.eval(n.elt, sc)); return; }
          var cl = n.clauses[idx];
          var items = toList(self2.eval(cl.iter, sc), n.line);
          for (var k2 = 0; k2 < items.length; k2++) {
            self2.tick(n.line);
            self2.assign(cl.target, items[k2], sc);
            var okc = true;
            for (var c2 = 0; c2 < cl.conds.length; c2++) {
              if (!truthy(self2.eval(cl.conds[c2], sc))) { okc = false; break; }
            }
            if (okc) walk(idx + 1, sc);
          }
        }
        walk(0, scope);
        return res;
      }
      case 'FStr': {
        var out = '';
        for (var p = 0; p < n.parts.length; p++) {
          var part = n.parts[p];
          if (part.type === 'lit') out += part.value;
          else {
            var v = this.eval(part.node, scope);
            if (part.spec && /^\.\d+f$/.test(part.spec)) out += num(v).toFixed(parseInt(part.spec.slice(1), 10));
            else out += pyStr(v);
          }
        }
        return out;
      }
      case 'Un': {
        var uv = this.eval(n.value, scope);
        if (n.op === 'not') return !truthy(uv);
        if (!isNum(uv)) throw pyErr('унарный минус работает только с числами', n.line, 'TypeError');
        return mkNum(-num(uv), isF(uv));
      }
      case 'Bool': {
        var res = null;
        for (var b = 0; b < n.items.length; b++) {
          var bv = this.eval(n.items[b], scope);
          if (n.op === 'and') {
            if (!truthy(bv)) return bv;
            res = bv;
          } else {
            if (truthy(bv)) return bv;
            res = bv;
          }
        }
        return res;
      }
      case 'Cmp': {
        var left = this.eval(n.operands[0], scope);
        for (var c = 0; c < n.ops.length; c++) {
          var right = this.eval(n.operands[c + 1], scope);
          var op = n.ops[c], ok = false;
          if (op === '==') ok = pyEq(left, right);
          else if (op === '!=') ok = !pyEq(left, right);
          else if (op === '<') ok = pyCmp(left, right, n.line) < 0;
          else if (op === '>') ok = pyCmp(left, right, n.line) > 0;
          else if (op === '<=') ok = pyCmp(left, right, n.line) <= 0;
          else if (op === '>=') ok = pyCmp(left, right, n.line) >= 0;
          else if (op === 'in') ok = contains(left, right, n.line);
          else if (op === 'not in') ok = !contains(left, right, n.line);
          if (!ok) return false;
          left = right;
        }
        return true;
      }
      case 'Bin': {
        var l = this.eval(n.l, scope), r = this.eval(n.r, scope);
        return binop(n.op, l, r, n.line);
      }
      case 'IfExp':
        return truthy(this.eval(n.cond, scope)) ? this.eval(n.a, scope) : this.eval(n.b, scope);
      case 'Sub': {
        var obj = this.eval(n.obj, scope);
        var idx = this.eval(n.idx, scope);
        if (Array.isArray(obj)) {
          var i1 = toIndex(idx, n.line);
          if (i1 < 0) i1 += obj.length;
          if (i1 < 0 || i1 >= obj.length) throw pyErr('индекс ' + idx + ' вне списка длиной ' + obj.length, n.line, 'IndexError');
          return obj[i1];
        }
        if (typeof obj === 'string') {
          var i2 = toIndex(idx, n.line);
          if (i2 < 0) i2 += obj.length;
          if (i2 < 0 || i2 >= obj.length) throw pyErr('индекс ' + idx + ' вне строки длиной ' + obj.length, n.line, 'IndexError');
          return obj[i2];
        }
        if (obj instanceof Map) {
          if (!obj.has(idx)) throw pyErr('ключа ' + pyRepr(idx) + ' нет в словаре', n.line, 'KeyError');
          return obj.get(idx);
        }
        throw pyErr('объект ' + typeName(obj) + ' не индексируется', n.line, 'TypeError');
      }
      case 'SliceExpr': {
        var o = this.eval(n.obj, scope);
        var sp = n.slice;
        var start = sp.start ? this.eval(sp.start, scope) : null;
        var stop = sp.stop ? this.eval(sp.stop, scope) : null;
        var step = sp.step ? this.eval(sp.step, scope) : null;
        return doSlice(o, start, stop, step, n.line);
      }
      case 'Attr': {
        var ob = this.eval(n.obj, scope);
        return this.attr(ob, n.name, n.line);
      }
      case 'Call': {
        var fn = this.eval(n.fn, scope);
        var args = [];
        for (var a = 0; a < n.args.length; a++) args.push(this.eval(n.args[a], scope));
        var kwargs = [];
        for (var kw = 0; kw < n.kwargs.length; kw++) {
          kwargs.push({ name: n.kwargs[kw].name, value: this.eval(n.kwargs[kw].value, scope) });
        }
        if (typeof fn !== 'function') throw pyErr('объект ' + typeName(fn) + ' нельзя вызвать как функцию', n.line, 'TypeError');
        return fn(args, kwargs);
      }
      default:
        throw pyErr('неизвестное выражение: ' + n.type, n.line);
    }
  };

  function doSlice(obj, start, stop, step, line) {
    var isStr = typeof obj === 'string';
    var arr = isStr ? obj.split('') : obj;
    if (!Array.isArray(arr)) throw pyErr('срез работает только со строками и списками', line, 'TypeError');
    var len = arr.length;
    var st = step === null ? 1 : toIndex(step, line);
    if (st === 0) throw pyErr('шаг среза не может быть 0', line, 'ValueError');
    var a, b;
    if (start === null) a = st > 0 ? 0 : len - 1;
    else { a = toIndex(start, line); if (a < 0) a += len; }
    if (stop === null) b = st > 0 ? len : -1;
    else { b = toIndex(stop, line); if (b < 0) b += len; }
    var out = [];
    if (st > 0) { for (var i = a; i < b && i < len; i += st) if (i >= 0) out.push(arr[i]); }
    else { for (var k = Math.min(a, len - 1); k > b && k >= 0; k += st) out.push(arr[k]); }
    return isStr ? out.join('') : out;
  }

  /* --------- атрибуты и методы --------- */

  Interp.prototype.attr = function (obj, name, line) {
    var self = this;
    if (typeof obj === 'string') {
      var strMethods = {
        upper: function () { return obj.toUpperCase(); },
        lower: function () { return obj.toLowerCase(); },
        title: function () {
          return obj.replace(/[\p{L}\p{N}_']+/gu, function (w) {
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
          });
        },
        capitalize: function () { return obj.charAt(0).toUpperCase() + obj.slice(1).toLowerCase(); },
        strip: function (args) { return stripChars(obj, args[0], true, true); },
        lstrip: function (args) { return stripChars(obj, args[0], true, false); },
        rstrip: function (args) { return stripChars(obj, args[0], false, true); },
        split: function (args) {
          if (args.length === 0 || args[0] === null) {
            var parts = obj.split(/[ \n\t]+/).filter(function (s) { return s.length > 0; });
            return parts;
          }
          return obj.split(String(args[0]));
        },
        join: function (args) { return toList(args[0], line).map(pyStr).join(obj); },
        replace: function (args) { return obj.split(String(args[0])).join(String(args[1])); },
        find: function (args) { return obj.indexOf(String(args[0])); },
        rfind: function (args) { return obj.lastIndexOf(String(args[0])); },
        count: function (args) { var s = String(args[0]); if (!s) return obj.length + 1; return obj.split(s).length - 1; },
        startswith: function (args) { return obj.indexOf(String(args[0])) === 0; },
        endswith: function (args) { var s = String(args[0]); return obj.slice(obj.length - s.length) === s; },
        isdigit: function () { return obj.length > 0 && /^\d+$/.test(obj); },
        isalpha: function () { return obj.length > 0 && /^[\p{L}]+$/u.test(obj); },
        isspace: function () { return obj.length > 0 && /^\s+$/.test(obj); },
        isupper: function () { return obj === obj.toUpperCase() && /[\p{L}]/u.test(obj); },
        islower: function () { return obj === obj.toLowerCase() && /[\p{L}]/u.test(obj); },
        zfill: function (args) { var w = toIndex(args[0], line); var s = obj; var sign = ''; if (s[0] === '-' || s[0] === '+') { sign = s[0]; s = s.slice(1); } while (s.length + sign.length < w) s = '0' + s; return sign + s; },
        format: function (args) {
          var i = 0;
          return obj.replace(/\{(\d*)\}/g, function (_, idx) {
            var v = idx === '' ? args[i++] : args[parseInt(idx, 10)];
            return pyStr(v);
          });
        }
      };
      if (strMethods[name]) return wrapMethod(strMethods[name], name);
      throw pyErr('у строки нет метода «' + name + '»', line, 'AttributeError');
    }

    if (Array.isArray(obj)) {
      var listMethods = {
        append: function (args) { obj.push(args[0]); return null; },
        extend: function (args) { var add = toList(args[0], line); for (var i = 0; i < add.length; i++) obj.push(add[i]); return null; },
        insert: function (args) { var i = toIndex(args[0], line); if (i < 0) i = Math.max(0, obj.length + i); obj.splice(i, 0, args[1]); return null; },
        pop: function (args) {
          if (!obj.length) throw pyErr('нельзя pop из пустого списка', line, 'IndexError');
          var i = args.length ? toIndex(args[0], line) : obj.length - 1;
          if (i < 0) i += obj.length;
          if (i < 0 || i >= obj.length) throw pyErr('индекс ' + i + ' вне списка', line, 'IndexError');
          return obj.splice(i, 1)[0];
        },
        remove: function (args) {
          for (var i = 0; i < obj.length; i++) if (pyEq(obj[i], args[0])) { obj.splice(i, 1); return null; }
          throw pyErr('значения ' + pyRepr(args[0]) + ' нет в списке', line, 'ValueError');
        },
        index: function (args) {
          for (var i = 0; i < obj.length; i++) if (pyEq(obj[i], args[0])) return i;
          throw pyErr('значения ' + pyRepr(args[0]) + ' нет в списке', line, 'ValueError');
        },
        count: function (args) { var c = 0; for (var i = 0; i < obj.length; i++) if (pyEq(obj[i], args[0])) c++; return c; },
        sort: function (args, kwargs) {
          var rev = false;
          (kwargs || []).forEach(function (kw) {
            if (kw.name === 'reverse') rev = truthy(kw.value);
            else if (kw.name === 'key') throw pyErr('key= в тренажёре не поддерживается: отсортируй по правилу вручную', line, 'NotSupported');
          });
          obj.sort(function (a, b) { return pyCmp(a, b, line); });
          if (rev) obj.reverse();
          return null;
        },
        reverse: function () { obj.reverse(); return null; },
        copy: function () { return obj.slice(); },
        clear: function () { obj.length = 0; return null; }
      };
      if (listMethods[name]) return wrapMethod(listMethods[name], name);
      throw pyErr('у списка нет метода «' + name + '»', line, 'AttributeError');
    }

    if (obj instanceof S) {
      var n0 = obj;
      var setMethods = {
        add: function (args) { n0.add(args[0]); return null; },
        discard: function (args) { n0.delete(args[0]); return null; },
        remove: function (args) {
          if (!n0.has(args[0])) throw pyErr('элемента ' + pyRepr(args[0]) + ' нет в множестве', line, 'KeyError');
          n0.delete(args[0]); return null;
        },
        union: function (args) { var u = new S(n0.values()); toList(args[0], line).forEach(function (v) { u.add(v); }); return u; },
        intersection: function (args) { var o = toList(args[0], line); var r = new S(); r.m.forEach; n0.values().forEach(function (v) { if (o.some(function (x) { return pyEq(x, v); })) r.add(v); }); return r; },
        copy: function () { return new S(n0.values()); },
        clear: function () { n0.m.clear(); return null; }
      };
      if (setMethods[name]) return wrapMethod(setMethods[name], name);
      throw pyErr('у множества нет метода «' + name + '»', line, 'AttributeError');
    }

    if (obj instanceof Map) {
      var dictMethods = {
        keys: function () { var r = []; obj.forEach(function (_, k) { r.push(k); }); return r; },
        values: function () { var r = []; obj.forEach(function (v) { r.push(v); }); return r; },
        items: function () { var r = []; obj.forEach(function (v, k) { r.push([k, v]); }); return r; },
        get: function (args) { return obj.has(args[0]) ? obj.get(args[0]) : (args.length > 1 ? args[1] : null); },
        pop: function (args) {
          if (!obj.has(args[0])) {
            if (args.length > 1) return args[1];
            throw pyErr('ключа ' + pyRepr(args[0]) + ' нет в словаре', line, 'KeyError');
          }
          var v = obj.get(args[0]); obj.delete(args[0]); return v;
        },
        update: function (args) {
          var other = args[0];
          if (other instanceof Map) other.forEach(function (v, k) { obj.set(k, v); });
          return null;
        },
        clear: function () { obj.clear(); return null; },
        copy: function () { var m = new Map(); obj.forEach(function (v, k) { m.set(k, v); }); return m; }
      };
      if (dictMethods[name]) return wrapMethod(dictMethods[name], name);
      throw pyErr('у словаря нет метода «' + name + '»', line, 'AttributeError');
    }

    if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, name)) {
      var v = obj[name];
      if (typeof v === 'function') return wrapMethod(v, name);
      return v;
    }
    throw pyErr('у объекта ' + typeName(obj) + ' нет «' + name + '»', line, 'AttributeError');
  };

  function wrapMethod(fn, name) {
    function wrapped(args, kwargs) { return fn(args || [], kwargs || []); }
    wrapped.pyName = name;
    return wrapped;
  }

  function stripChars(s, chars, left, right) {
    var set = chars === undefined || chars === null ? null : String(chars);
    var isIn = function (ch) { return set === null ? /\s/.test(ch) : set.indexOf(ch) >= 0; };
    var a = 0, b = s.length;
    if (left) while (a < b && isIn(s[a])) a++;
    if (right) while (b > a && isIn(s[b - 1])) b--;
    return s.slice(a, b);
  }

  /* --------- модули --------- */

  Interp.prototype.module = function (name, line) {
    var self = this;
    if (name === 'math') {
      return {
        __module: true, __name: 'math',
        pi: Math.PI, e: Math.E, tau: 2 * Math.PI, inf: Infinity,
        sqrt: wrapMethod(function (a) { return Math.sqrt(a[0]); }, 'sqrt'),
        floor: wrapMethod(function (a) { return Math.floor(a[0]); }, 'floor'),
        ceil: wrapMethod(function (a) { return Math.ceil(a[0]); }, 'ceil'),
        fabs: wrapMethod(function (a) { return Math.abs(a[0]); }, 'fabs'),
        pow: wrapMethod(function (a) { return Math.pow(a[0], a[1]); }, 'pow'),
        log: wrapMethod(function (a) { return a.length > 1 ? Math.log(a[0]) / Math.log(a[1]) : Math.log(a[0]); }, 'log'),
        log2: wrapMethod(function (a) { return Math.log2(a[0]); }, 'log2'),
        log10: wrapMethod(function (a) { return Math.log10(a[0]); }, 'log10'),
        sin: wrapMethod(function (a) { return Math.sin(a[0]); }, 'sin'),
        cos: wrapMethod(function (a) { return Math.cos(a[0]); }, 'cos'),
        tan: wrapMethod(function (a) { return Math.tan(a[0]); }, 'tan'),
        atan2: wrapMethod(function (a) { return Math.atan2(a[0], a[1]); }, 'atan2'),
        hypot: wrapMethod(function (a) { return Math.hypot(a[0], a[1]); }, 'hypot'),
        factorial: wrapMethod(function (a) { var r = 1; for (var i = 2; i <= a[0]; i++) r *= i; return r; }, 'factorial'),
        gcd: wrapMethod(function (a) { var x = Math.abs(a[0]), y = Math.abs(a[1]); while (y) { var t = y; y = x % y; x = t; } return x; }, 'gcd'),
        degrees: wrapMethod(function (a) { return a[0] * 180 / Math.PI; }, 'degrees'),
        radians: wrapMethod(function (a) { return a[0] * Math.PI / 180; }, 'radians')
      };
    }
    if (name === 'random') {
      return {
        __module: true, __name: 'random',
        random: wrapMethod(function () { return Math.random(); }, 'random'),
        randint: wrapMethod(function (a) { return Math.floor(Math.random() * (a[1] - a[0] + 1)) + a[0]; }, 'randint'),
        randrange: wrapMethod(function (a) {
          var start = a.length > 1 ? a[0] : 0, stop = a.length > 1 ? a[1] : a[0], step = a.length > 2 ? a[2] : 1;
          var n = Math.floor((stop - start) / step);
          return start + step * Math.floor(Math.random() * n);
        }, 'randrange'),
        choice: wrapMethod(function (a) { var l = toList(a[0], line); return l[Math.floor(Math.random() * l.length)]; }, 'choice'),
        shuffle: wrapMethod(function (a) { var l = a[0]; for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = l[i]; l[i] = l[j]; l[j] = t; } return null; }, 'shuffle'),
        seed: wrapMethod(function () { return null; }, 'seed')
      };
    }
    if (name === 'sys') return { __module: true, __name: 'sys', maxsize: Number.MAX_SAFE_INTEGER };
    throw pyErr('модуль «' + name + '» в тренажёре не подключён (есть math, random, sys)', line, 'ImportError');
  };

  /* --------- встроенные функции --------- */

  Interp.prototype.builtins = function (name, line) {
    var self = this;
    switch (name) {
      case 'print': return wrapMethod(function (args, kwargs) {
        var sep = ' ', end = '\n';
        for (var i = 0; i < (kwargs || []).length; i++) {
          if (kwargs[i].name === 'sep') sep = pyStr(kwargs[i].value);
          if (kwargs[i].name === 'end') end = pyStr(kwargs[i].value);
        }
        var text = args.map(pyStr).join(sep) + end;
        var parts = text.split('\n');
        for (var p = 0; p < parts.length; p++) {
          if (p === parts.length - 1) {
            if (parts[p] !== '') self.lines.push(parts[p]);
          } else self.lines.push(parts[p]);
        }
        return null;
      }, 'print');

      case 'input': return wrapMethod(function (args) {
        if (self.stdinPos >= self.stdin.length) {
          throw pyErr('программа просит ввод, но во вводе больше нет строк. Проверь, сколько раз вызывается input()', line, 'EOFError');
        }
        return self.stdin[self.stdinPos++];
      }, 'input');

      case 'len': return wrapMethod(function (args) {
        var v = args[0];
        if (typeof v === 'string') return v.length;
        if (Array.isArray(v)) return v.length;
        if (v instanceof S) return v.size();
        if (v instanceof Map) return v.size;
        throw pyErr('у объекта ' + typeName(v) + ' нет длины', line, 'TypeError');
      }, 'len');

      case 'int': return wrapMethod(function (args) {
        var v = args[0];
        if (isNum(v)) return Math.trunc(num(v));
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (typeof v === 'string') {
          var s = v.trim();
          if (!/^[+-]?\d+$/.test(s)) throw pyErr('нельзя превратить «' + v + '» в целое число', line, 'ValueError');
          return parseInt(s, 10);
        }
        throw pyErr('int() не работает с ' + typeName(v), line, 'TypeError');
      }, 'int');

      case 'float': return wrapMethod(function (args) {
        var v = args[0];
        if (isNum(v)) return new F(num(v));
        if (typeof v === 'string') {
          var s = v.trim().replace(',', '.');
          var f = Number(s);
          if (Number.isNaN(f)) throw pyErr('нельзя превратить «' + v + '» в число', line, 'ValueError');
          return f;
        }
        throw pyErr('float() не работает с ' + typeName(v), line, 'TypeError');
      }, 'float');

      case 'str': return wrapMethod(function (args) { return args.length ? pyStr(args[0]) : ''; }, 'str');
      case 'repr': return wrapMethod(function (args) { return pyRepr(args[0]); }, 'repr');
      case 'bool': return wrapMethod(function (args) { return args.length ? truthy(args[0]) : false; }, 'bool');
      case 'abs': return wrapMethod(function (args) {
        if (!isNum(args[0])) throw pyErr('abs() работает только с числами', line, 'TypeError');
        return mkNum(Math.abs(num(args[0])), isF(args[0]));
      }, 'abs');
      case 'round': return wrapMethod(function (args) {
        if (!isNum(args[0])) throw pyErr('round() работает только с числами', line, 'TypeError');
        if (args.length < 2) return pyRound(num(args[0]));
        var f = Math.pow(10, num(args[1]));
        return new F(pyRound(num(args[0]) * f) / f);
      }, 'round');
      case 'min': case 'max': return wrapMethod(function (args) {
        var items = args.length === 1 ? toList(args[0], line) : args;
        if (!items.length) throw pyErr(name + '() от пустого списка', line, 'ValueError');
        var best = items[0];
        for (var i = 1; i < items.length; i++) {
          var c = pyCmp(items[i], best, line);
          if (name === 'min' ? c < 0 : c > 0) best = items[i];
        }
        return best;
      }, name);
      case 'sum': return wrapMethod(function (args) {
        var items = toList(args[0], line), total = args.length > 1 ? args[1] : 0;
        for (var i = 0; i < items.length; i++) total = binop('+', total, items[i], line);
        return total;
      }, 'sum');
      case 'sorted': return wrapMethod(function (args, kwargs) {
        var items = toList(args[0], line).slice();
        var rev = false;
        for (var i = 0; i < (kwargs || []).length; i++) {
          if (kwargs[i].name === 'reverse') rev = truthy(kwargs[i].value);
          else if (kwargs[i].name === 'key') throw pyErr('key= в тренажёре не поддерживается: отсортируй по правилу вручную', line, 'NotSupported');
        }
        items.sort(function (a, b) { return pyCmp(a, b, line); });
        if (rev) items.reverse();
        return items;
      }, 'sorted');
      case 'reversed': return wrapMethod(function (args) { return toList(args[0], line).slice().reverse(); }, 'reversed');
      case 'list': return wrapMethod(function (args) { return args.length ? toList(args[0], line).slice() : []; }, 'list');
      case 'range': return wrapMethod(function (args) {
        var start = 0, stop, step = 1;
        if (args.length === 1) stop = args[0];
        else { start = args[0]; stop = args[1]; if (args.length > 2) step = args[2]; }
        [start, stop, step].forEach(function (x) {
          if (typeof x !== 'number' || !Number.isInteger(x)) throw pyErr('range() принимает только целые числа', line, 'TypeError');
        });
        if (step === 0) throw pyErr('шаг range() не может быть 0', line, 'ValueError');
        var out = [];
        if (step > 0) { for (var i = start; i < stop; i += step) out.push(i); }
        else { for (var k = start; k > stop; k += step) out.push(k); }
        if (out.length > 1000000) throw pyErr('range() слишком большой для тренажёра', line);
        return out;
      }, 'range');
      case 'enumerate': return wrapMethod(function (args) {
        var items = toList(args[0], line), start = args.length > 1 ? args[1] : 0, out = [];
        for (var i = 0; i < items.length; i++) out.push([start + i, items[i]]);
        return out;
      }, 'enumerate');
      case 'zip': return wrapMethod(function (args) {
        var lists = args.map(function (a) { return toList(a, line); });
        var n = Math.min.apply(null, lists.map(function (l) { return l.length; }));
        var out = [];
        for (var i = 0; i < n; i++) out.push(lists.map(function (l) { return l[i]; }));
        return out;
      }, 'zip');
      case 'set': case 'frozenset': return wrapMethod(function (args) {
        return new S(args.length ? toList(args[0], line) : []);
      }, name);
      case 'dict': return wrapMethod(function (args) {
        var m = new Map();
        if (args.length && args[0] instanceof Map) args[0].forEach(function (v, k) { m.set(k, v); });
        return m;
      }, 'dict');
      case 'type': return wrapMethod(function (args) { return "<class '" + typeName(args[0]) + "'>"; }, 'type');
      case 'ord': return wrapMethod(function (args) { return String(args[0]).codePointAt(0); }, 'ord');
      case 'chr': return wrapMethod(function (args) { return String.fromCodePoint(args[0]); }, 'chr');
      case 'help': return wrapMethod(function () { return null; }, 'help');
      case 'str.join': return null;
      default: return undefined;
    }
  };

  /* ============================ ПУБЛИЧНЫЙ API ============================ */

  function run(code, opts) {
    opts = opts || {};
    var it = new Interp(opts.stdin || [], opts);
    try {
      var toks = tokenize(String(code || ''));
      var ast = new Parser(toks).parseModule();
      it.runModule(ast);
      return { ok: true, output: it.lines.join('\n'), trace: it.trace, error: null };
    } catch (e) {
      if (e && e.isPy) {
        return {
          ok: false,
          output: it.lines.join('\n'),
          trace: it.trace,
          error: { msg: e.message, line: e.line, kind: e.kind || 'Ошибка' }
        };
      }
      return {
        ok: false,
        output: it.lines.join('\n'),
        trace: it.trace,
        error: { msg: 'Внутренняя ошибка тренажёра: ' + (e && e.message ? e.message : String(e)), line: null, kind: 'InternalError' }
      };
    }
  }

  global.PyTrainer = { run: run, tokenize: tokenize, version: '1.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.PyTrainer;
})(typeof window !== 'undefined' ? window : globalThis);
