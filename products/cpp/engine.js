/* ==========================================================================
   Мини-компилятор C++ для браузера: лексер + парсер + интерпретатор.
   Поддержано: int/long/double/bool/char/string/auto, массивы, vector,
   if/else, for, while, do-while, break/continue, функции и рекурсия,
   cout << … << endl, cin >> …, арифметика, сравнения, логика,
   std::size(), string::size/substr, vector::push_back/size/at.
   Эталон — поведение g++ для этой части языка.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------- ошибки -------------------------------- */
  function CompileError(line, msg) { this.name = 'CompileError'; this.line = line; this.message = msg; }
  function RuntimeError(line, msg) { this.name = 'RuntimeError'; this.line = line; this.message = msg; }
  CompileError.prototype = Object.create(Error.prototype);
  RuntimeError.prototype = Object.create(Error.prototype);
  function cerr(line, msg) { return new CompileError(line, msg); }
  function rerr(line, msg) { return new RuntimeError(line, msg); }

  /* -------------------------------- лексер ------------------------------- */
  var PUNCT = ['<<=', '>>=', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '++', '--',
    '+=', '-=', '*=', '/=', '%=', '::', '->', '+', '-', '*', '/', '%', '=', '<', '>', '!',
    '(', ')', '{', '}', '[', ']', ';', ',', '.', '?', ':', '&', '|', '^', '~'];

  function tokenize(src) {
    var toks = [], i = 0, line = 1, n = src.length;
    function push(k, v, extra) {
      var t = { k: k, v: v, line: line };
      if (extra) for (var e in extra) t[e] = extra[e];
      toks.push(t);
    }
    while (i < n) {
      var c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
        i += 2; continue;
      }
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        var j = i, isFloat = false;
        while (j < n && /[0-9]/.test(src[j])) j++;
        if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) { isFloat = true; j++; while (j < n && /[0-9]/.test(src[j])) j++; }
        while (j < n && /[fFlLuU]/.test(src[j])) { if (/[fF]/.test(src[j])) isFloat = true; j++; }
        var lit = src.slice(i, j).replace(/[fFlLuU]/g, '');
        push('num', parseFloat(lit), { isFloat: isFloat });
        i = j; continue;
      }
      if (c === '"' || c === "'") {
        var q = c, startLine = line, val = '';
        i++;
        while (i < n && src[i] !== q) {
          if (src[i] === '\\') {
            var map = { n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', '"': '"', "'": "'" };
            var e = src[i + 1];
            val += (e in map) ? map[e] : e;
            i += 2; continue;
          }
          if (src[i] === '\n') line++;
          val += src[i]; i++;
        }
        if (i >= n) throw cerr(startLine, 'не закрыта кавычка');
        i++;
        push(q === '"' ? 'str' : 'chr', val, { line: startLine });
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var s = i;
        while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
        push('id', src.slice(s, i));
        continue;
      }
      var matched = null;
      for (var p = 0; p < PUNCT.length; p++) { if (src.substr(i, PUNCT[p].length) === PUNCT[p]) { matched = PUNCT[p]; break; } }
      if (!matched) throw cerr(line, 'непонятный символ «' + c + '»');
      push('p', matched);
      i += matched.length;
    }
    // std::name → один идентификатор
    var out = [];
    for (var k = 0; k < toks.length; k++) {
      var t = toks[k];
      if (t.k === 'id' && toks[k + 1] && toks[k + 1].k === 'p' && toks[k + 1].v === '::' && toks[k + 2] && toks[k + 2].k === 'id') {
        out.push({ k: 'id', v: t.v + '::' + toks[k + 2].v, line: t.line });
        k += 2; continue;
      }
      out.push(t);
    }
    out.push({ k: 'eof', v: '<конец>', line: line });
    return out;
  }

  /* -------------------------------- парсер ------------------------------- */
  var BASE_TYPES = { int: 'int', long: 'int', short: 'int', size_t: 'int', unsigned: 'int',
    double: 'double', float: 'double', bool: 'bool', char: 'char', string: 'string', void: 'void', auto: 'auto' };

  function Parser(toks) { this.t = toks; this.i = 0; }
  Parser.prototype.peek = function (k) { return this.t[this.i + (k || 0)]; };
  Parser.prototype.next = function () { return this.t[this.i++]; };
  Parser.prototype.is = function (v, k) { var t = this.peek(k); return !!t && t.k === 'p' && t.v === v; };
  Parser.prototype.isId = function (v, k) { var t = this.peek(k); return !!t && t.k === 'id' && t.v === v; };
  Parser.prototype.eat = function (v) { if (this.is(v)) { this.next(); return true; } return false; };
  Parser.prototype.expect = function (v) {
    if (!this.is(v)) throw cerr(this.peek().line, 'ожидалось «' + v + '», а встретилось «' + this.peek().v + '»');
    return this.next();
  };
  Parser.prototype.err = function (msg) { throw cerr(this.peek().line, msg); };

  Parser.prototype.parseType = function () {
    var t = this.peek();
    if (t.k !== 'id') return null;
    if (t.v === 'const') { this.next(); return this.parseType(); }
    if (t.v === 'vector') {
      this.next(); this.expect('<');
      var el = this.parseType();
      if (!el) this.err('внутри vector<> нужен тип, например vector<int>');
      this.expect('>');
      return { base: 'vector', elem: el };
    }
    if (t.v === 'std::string') { this.next(); return { base: 'string' }; }
    if (BASE_TYPES[t.v.toLowerCase()] !== undefined && BASE_TYPES[t.v] !== undefined) {
      this.next();
      if (t.v === 'long' && this.isId('long')) this.next();
      if (t.v === 'unsigned' && this.peek().k === 'id') this.next();
      var base = BASE_TYPES[t.v];
      return { base: base };
    }
    return null;
  };

  Parser.prototype.parseProgram = function () {
    var funcs = {}, globals = [];
    while (this.peek().k !== 'eof') {
      if (this.isId('using')) { while (this.peek().k !== 'eof' && !this.is(';')) this.next(); this.eat(';'); continue; }
      if (this.isId('typedef')) { while (this.peek().k !== 'eof' && !this.is(';')) this.next(); this.eat(';'); continue; }
      var line = this.peek().line;
      var type = this.parseType();
      if (!type) this.err('ожидалось объявление или функция, а встретилось «' + this.peek().v + '»');
      if (this.peek().k !== 'id') this.err('после типа ожидалось имя');
      var name = this.next().v;
      if (this.is('(')) {
        var params = this.parseParams();
        if (this.eat(';')) continue; // прототип: тело будет ниже
        if (!this.is('{')) this.err('ожидалось тело функции «{»');
        var body = this.parseBlock();
        funcs[name] = { name: name, params: params, body: body, retType: type, line: line };
      } else {
        var decls = this.parseDeclRest(type, name, line);
        this.expect(';');
        globals = globals.concat(decls);
      }
    }
    return { funcs: funcs, globals: globals };
  };

  Parser.prototype.parseParams = function () {
    this.expect('(');
    var params = [];
    if (this.is(')')) { this.next(); return params; }
    if (this.isId('void') && this.is(')', 1)) { this.next(); this.next(); return params; }
    while (true) {
      var type = this.parseType();
      if (!type) this.err('в списке параметров ожидался тип');
      var pname = null;
      if (this.peek().k === 'id') pname = this.next().v;
      else pname = '_arg' + params.length;
      params.push({ name: pname, type: type });
      if (this.eat(',')) continue;
      break;
    }
    this.expect(')');
    return params;
  };

  Parser.prototype.parseBlock = function () {
    var line = this.expect('{').line;
    var stmts = [];
    while (!this.is('}')) {
      if (this.peek().k === 'eof') throw cerr(line, 'не закрыта фигурная скобка «{»');
      stmts.push(this.parseStmt());
    }
    this.expect('}');
    return { t: 'block', stmts: stmts, line: line };
  };

  Parser.prototype.parseInitValue = function () {
    if (this.is('{')) {
      this.next();
      var list = [];
      if (!this.is('}')) {
        list.push(this.parseInitValue());
        while (this.eat(',')) { if (this.is('}')) break; list.push(this.parseInitValue()); }
      }
      this.expect('}');
      return { list: list };
    }
    return { expr: this.parseExpr() };
  };

  Parser.prototype.parseDeclRest = function (type, firstName, line) {
    var out = [], name = firstName;
    while (true) {
      var d = { name: name, baseType: type, type: type, init: null, initList: null, dims: [], line: line };
      if (this.is('[')) {
        while (this.is('[')) {
          this.next();
          d.dims.push(this.is(']') ? null : this.parseExpr());
          this.expect(']');
        }
        var spec = type;
        for (var k = d.dims.length - 1; k >= 0; k--) spec = { base: 'array', elem: spec, sizeExpr: d.dims[k] };
        d.type = spec;
        if (this.eat('=')) d.initList = this.parseInitValue();
      } else if (this.eat('=')) {
        if (this.is('{')) d.initList = this.parseInitValue();
        else d.init = this.parseExpr();
      }
      out.push(d);
      if (this.eat(',')) {
        if (this.peek().k !== 'id') this.err('после запятой ожидалось имя переменной');
        name = this.next().v;
        continue;
      }
      break;
    }
    return out;
  };

  Parser.prototype.parseStmt = function () {
    var t = this.peek();
    if (this.is('{')) return this.parseBlock();
    if (this.is(';')) { this.next(); return { t: 'empty', line: t.line }; }

    if (t.k === 'id') {
      switch (t.v) {
        case 'if': {
          this.next(); this.expect('(');
          var cond = this.parseExpr(); this.expect(')');
          var thenS = this.parseStmt();
          var elseS = null;
          if (this.isId('else')) { this.next(); elseS = this.parseStmt(); }
          return { t: 'if', cond: cond, then: thenS, else: elseS, line: t.line };
        }
        case 'while': {
          this.next(); this.expect('(');
          var c2 = this.parseExpr(); this.expect(')');
          return { t: 'while', cond: c2, body: this.parseStmt(), line: t.line };
        }
        case 'do': {
          this.next();
          var body = this.parseStmt();
          if (!this.isId('while')) throw cerr(t.line, 'у do ожидалось «while (условие);»');
          this.next(); this.expect('(');
          var c3 = this.parseExpr(); this.expect(')'); this.expect(';');
          return { t: 'do', cond: c3, body: body, line: t.line };
        }
        case 'for': {
          this.next(); this.expect('(');
          var init = null;
          if (!this.is(';')) {
            var save = this.i;
            var typ = this.parseType();
            if (typ && this.peek().k === 'id') {
              var nm = this.next().v;
              var decls = this.parseDeclRest(typ, nm, t.line);
              init = { t: 'decl', decls: decls, line: t.line };
            } else {
              this.i = save;
              init = { t: 'expr', e: this.parseExpr(), line: t.line };
            }
          }
          this.expect(';');
          var cond2 = this.is(';') ? null : this.parseExpr();
          this.expect(';');
          var step = this.is(')') ? null : this.parseExpr();
          this.expect(')');
          return { t: 'for', init: init, cond: cond2, step: step, body: this.parseStmt(), line: t.line };
        }
        case 'break': this.next(); this.expect(';'); return { t: 'break', line: t.line };
        case 'continue': this.next(); this.expect(';'); return { t: 'continue', line: t.line };
        case 'return': {
          this.next();
          var e = this.is(';') ? null : this.parseExpr();
          this.expect(';');
          return { t: 'return', e: e, line: t.line };
        }
        case 'cout': case 'std::cout': {
          this.next();
          var items = [];
          while (this.eat('<<')) items.push(this.parseExpr());
          if (!items.length) this.err('после cout нужно «<<» и что вывести');
          this.expect(';');
          return { t: 'cout', items: items, line: t.line };
        }
      }
      var save2 = this.i;
      var type2 = this.parseType();
      if (type2 && this.peek().k === 'id') {
        var name2 = this.next().v;
        var d2 = this.parseDeclRest(type2, name2, t.line);
        this.expect(';');
        return { t: 'decl', decls: d2, line: t.line };
      }
      this.i = save2;
    }
    var expr = this.parseExpr();
    this.expect(';');
    return { t: 'expr', e: expr, line: t.line };
  };

  /* --- выражения: приоритеты --- */
  Parser.prototype.parseExpr = function () { return this.parseAssign(); };

  Parser.prototype.parseAssign = function () {
    var left = this.parseTernary();
    var ops = ['=', '+=', '-=', '*=', '/=', '%='];
    for (var i = 0; i < ops.length; i++) {
      if (this.is(ops[i])) {
        var line = this.next().line;
        if (left.t !== 'ident' && left.t !== 'index') throw cerr(line, 'слева от «' + ops[i] + '» должна быть переменная');
        var right = this.parseAssign();
        return { t: 'assign', op: ops[i], target: left, value: right, line: line };
      }
    }
    return left;
  };

  Parser.prototype.parseTernary = function () {
    var cond = this.parseOr();
    if (this.is('?')) {
      var line = this.next().line;
      var a = this.parseAssign();
      this.expect(':');
      var b = this.parseAssign();
      return { t: 'cond', cond: cond, a: a, b: b, line: line };
    }
    return cond;
  };

  Parser.prototype.binary = function (ops, nextFn) {
    var left = nextFn.call(this);
    while (true) {
      var matched = null;
      for (var i = 0; i < ops.length; i++) if (this.is(ops[i])) { matched = ops[i]; break; }
      if (!matched) return left;
      var line = this.next().line;
      var right = nextFn.call(this);
      left = { t: 'bin', op: matched, a: left, b: right, line: line };
    }
  };
  Parser.prototype.parseOr = function () { return this.binary(['||'], this.parseAnd); };
  Parser.prototype.parseAnd = function () { return this.binary(['&&'], this.parseEq); };
  Parser.prototype.parseEq = function () { return this.binary(['==', '!='], this.parseRel); };
  Parser.prototype.parseRel = function () { return this.binary(['<=', '>=', '<', '>'], this.parseAdd); };
  Parser.prototype.parseAdd = function () { return this.binary(['+', '-'], this.parseMul); };
  Parser.prototype.parseMul = function () { return this.binary(['*', '/', '%'], this.parseUnary); };

  Parser.prototype.parseUnary = function () {
    var t = this.peek();
    if (this.is('!') || this.is('-') || this.is('+')) {
      this.next();
      return { t: 'unary', op: t.v, e: this.parseUnary(), line: t.line };
    }
    if (this.is('++') || this.is('--')) {
      this.next();
      var e = this.parseUnary();
      if (e.t !== 'ident' && e.t !== 'index') throw cerr(t.line, '«' + t.v + '» работает только с переменной');
      return { t: 'incdec', op: t.v, e: e, prefix: true, line: t.line };
    }
    return this.parsePostfix();
  };

  Parser.prototype.parsePostfix = function () {
    var e = this.parsePrimary();
    while (true) {
      if (this.is('(')) {
        var line = this.peek().line;
        this.next();
        var args = [];
        if (!this.is(')')) {
          args.push(this.parseExpr());
          while (this.eat(',')) args.push(this.parseExpr());
        }
        this.expect(')');
        if (e.t !== 'ident') throw cerr(line, 'вызвать можно только функцию');
        e = { t: 'call', name: e.name, args: args, line: line };
        continue;
      }
      if (this.is('[')) {
        var line2 = this.next().line;
        var idx = this.parseExpr();
        this.expect(']');
        e = { t: 'index', obj: e, index: idx, line: line2 };
        continue;
      }
      if (this.is('.')) {
        var line3 = this.next().line;
        if (this.peek().k !== 'id') this.err('после точки ожидалось имя метода');
        var mname = this.next().v;
        var margs = [];
        if (this.is('(')) {
          this.next();
          if (!this.is(')')) {
            margs.push(this.parseExpr());
            while (this.eat(',')) margs.push(this.parseExpr());
          }
          this.expect(')');
        }
        e = { t: 'method', obj: e, name: mname, args: margs, line: line3 };
        continue;
      }
      if (this.is('++') || this.is('--')) {
        var line4 = this.next().line;
        if (e.t !== 'ident' && e.t !== 'index') throw cerr(line4, '«' + this.t[this.i - 1].v + '» работает только с переменной');
        e = { t: 'incdec', op: this.t[this.i - 1].v, e: e, prefix: false, line: line4 };
        continue;
      }
      return e;
    }
  };

  Parser.prototype.parsePrimary = function () {
    var t = this.peek();
    if (t.k === 'num') { this.next(); return { t: 'num', v: t.v, isFloat: t.isFloat, line: t.line }; }
    if (t.k === 'str') { this.next(); return { t: 'str', v: t.v, line: t.line }; }
    if (t.k === 'chr') { this.next(); return { t: 'chr', v: t.v, line: t.line }; }
    if (t.k === 'id') {
      if (t.v === 'true' || t.v === 'false') { this.next(); return { t: 'bool', v: t.v === 'true', line: t.line }; }
      if (t.v === 'cin' || t.v === 'std::cin') {
        this.next();
        var targets = [];
        while (this.eat('>>')) {
          var e = this.parseUnary();
          if (e.t !== 'ident' && e.t !== 'index') throw cerr(t.line, 'cin >> принимает только переменную');
          targets.push(e);
        }
        if (!targets.length) this.err('после cin нужно «>>» и переменная');
        return { t: 'cin', targets: targets, line: t.line };
      }
      this.next();
      return { t: 'ident', name: t.v, line: t.line };
    }
    if (this.is('(')) {
      // приведение типа: (double)x, (int)y, (char)c
      var save = this.i;
      var tryCast = null;
      if (this.peek(1) && this.peek(1).k === 'id' &&
          (BASE_TYPES[this.peek(1).v] !== undefined || this.peek(1).v === 'string' || this.peek(1).v === 'std::string')) {
        this.next();
        tryCast = this.parseType();
        if (tryCast && this.is(')')) { this.next(); }
        else { tryCast = null; this.i = save; }
      }
      if (tryCast) {
        var inner = this.parseUnary();
        return { t: 'cast', type: tryCast, e: inner, line: t.line };
      }
      this.next();
      var e2 = this.parseExpr();
      this.expect(')');
      return e2;
    }
    this.err('неожиданный символ «' + t.v + '» в выражении');
  };

  /* ------------------------------ значения ------------------------------- */
  function V(type, val) { return { type: type, val: val }; }
  function isNumeric(type) { return type === 'int' || type === 'double' || type === 'bool' || type === 'char'; }
  function num(v) {
    switch (v.type) {
      case 'int': case 'double': return v.val;
      case 'bool': return v.val ? 1 : 0;
      case 'char': return v.val.length ? v.val.charCodeAt(0) : 0;
      default: throw rerr(0, 'это значение не число');
    }
  }
  function fmtDouble(x) {
    if (!isFinite(x)) return x > 0 ? 'inf' : (x < 0 ? '-inf' : 'nan');
    if (Number.isInteger(x)) return String(x);
    var r = Number(x.toPrecision(6));
    return String(r);
  }
  function fmt(v) {
    switch (v.type) {
      case 'int': return String(Math.trunc(v.val));
      case 'double': return fmtDouble(v.val);
      case 'bool': return v.val ? '1' : '0';
      case 'char': return v.val;
      case 'string': return v.val;
      default: return String(v.val);
    }
  }
  function truthy(v) {
    if (v.type === 'bool') return !!v.val;
    if (v.type === 'int' || v.type === 'double') return v.val !== 0;
    if (v.type === 'char') return v.val.length > 0;
    if (v.type === 'string') return v.val.length > 0;
    return !!v.val;
  }

  function convert(v, type, line) {
    var b = type.base;
    if (b === 'auto') return v;
    if (b === 'string') {
      if (v.type === 'string') return V('string', v.val);
      if (v.type === 'char') return V('string', v.val);
      return V('string', fmt(v));
    }
    if (b === 'char') {
      if (v.type === 'char') return V('char', v.val);
      if (v.type === 'string') return V('char', v.val.charAt(0));
      return V('char', String.fromCharCode(Math.trunc(num(v)) & 0xffff));
    }
    if (b === 'bool') return V('bool', truthy(v));
    if (b === 'double') return V('double', num(v));
    if (b === 'int') return V('int', Math.trunc(num(v)) || 0);
    if (b === 'array' || b === 'vector') return v;
    throw rerr(line, 'нельзя присвоить значение типу ' + b);
  }

  /* ------------------------------- среда -------------------------------- */
  function Env(parent) { this.vars = Object.create(null); this.parent = parent; }
  Env.prototype.has = function (name) {
    var e = this;
    while (e) { if (name in e.vars) return true; e = e.parent; }
    return false;
  };
  Env.prototype.get = function (name, line) {
    var e = this;
    while (e) {
      if (name in e.vars) return e.vars[name];
      e = e.parent;
    }
    throw rerr(line, 'переменная «' + name + '» не объявлена (или объявлена ниже)');
  };
  Env.prototype.set = function (name, value, line) {
    var e = this;
    while (e) {
      if (name in e.vars) { e.vars[name] = value; return; }
      e = e.parent;
    }
    throw rerr(line, 'переменная «' + name + '» не объявлена');
  };

  /* --------------------------- интерпретатор ---------------------------- */
  var BUILTINS = {
    abs: function (a) { return a.type === 'double' ? V('double', Math.abs(a.val)) : V('int', Math.abs(Math.trunc(num(a)))); },
    max: function (a, b) { return num(a) >= num(b) ? a : b; },
    min: function (a, b) { return num(a) <= num(b) ? a : b; },
    sqrt: function (a) { return V('double', Math.sqrt(num(a))); },
    pow: function (a, b) { return V('double', Math.pow(num(a), num(b))); },
    floor: function (a) { return V('double', Math.floor(num(a))); },
    ceil: function (a) { return V('double', Math.ceil(num(a))); },
    round: function (a) { return V('double', Math.round(num(a))); },
    to_string: function (a) { return V('string', fmt(a)); },
    stoi: function (a) { var n = parseInt(fmt(a), 10); return V('int', isNaN(n) ? 0 : n); },
    strlen: function (a) { return V('int', a.val.length); }
  };

  function Interpreter(prog, stdinText) {
    this.funcs = prog.funcs;
    this.globalDecls = prog.globals;
    this.out = '';
    this.tokens = String(stdinText || '').trim() ? String(stdinText).trim().split(/\s+/) : [];
    this.tokenPos = 0;
    this.steps = 0;
    this.depth = 0;
    this.globalEnv = new Env(null);
  }

  Interpreter.prototype.tick = function (line) {
    this.steps++;
    if (this.steps > 4000000) throw rerr(line, 'программа выполняется слишком долго — похоже на бесконечный цикл');
  };

  Interpreter.prototype.readToken = function (line) {
    if (this.tokenPos >= this.tokens.length) return null; // как в C++: поток «сломался»
    return this.tokens[this.tokenPos++];
  };

  Interpreter.prototype.run = function () {
    var self = this;
    // глобальные переменные
    this.globalDecls.forEach(function (d) { self.declare(d, self.globalEnv); });
    var main = this.funcs['main'];
    if (!main) throw cerr(1, 'в программе нет функции int main() — она нужна как точка входа');
    this.callFunction(main, [], 1);
    return this.out;
  };

  Interpreter.prototype.declare = function (d, env) {
    var type = d.type, value;
    var self = this;
    if (type.base === 'array') {
      value = this.buildArray(type, d.initList, env, d.line);
    } else if (type.base === 'vector') {
      value = V('vector', []);
      if (d.initList) {
        var items = d.initList.list || [];
        for (var k = 0; k < items.length; k++) {
          value.val.push(items[k].expr ? convert(this.eval(items[k].expr, env), type.elem, d.line) : zeroOf(type.elem));
        }
      }
    } else if (d.init) {
      var conv = this.eval(d.init, env);
      value = convert(conv, type, d.line);
      if (type.base === 'auto') value = conv;
    } else if (d.initList) {
      throw rerr(d.line, 'список {…} можно присвоить только массиву или vector');
    } else {
      value = zeroOf(type);
    }
    env.vars[d.name] = value;
    return value;
  };

  Interpreter.prototype.buildArray = function (type, initNode, env, line) {
    var self = this;
    var items = initNode && initNode.list ? initNode.list : null;
    var size = 0;
    if (type.sizeExpr) size = Math.trunc(num(this.eval(type.sizeExpr, env)));
    else if (items) size = items.length;
    if (type.elem.base === 'array' && !type.elem.sizeExpr && items && items.length && items[0].list) {
      // int m[][3] = {{...}} — внутренний размер берём из первой строки
    }
    var arr = [];
    for (var i = 0; i < size; i++) {
      var item = items ? items[i] : null;
      if (!item && items && items.length && items[0].list && type.elem.base === 'array') {
        item = { list: [] };
      }
      if (type.elem.base === 'array') {
        var innerType = type.elem;
        if (!innerType.sizeExpr) {
          var probe = item && item.list ? item.list.length : 0;
          innerType = { base: 'array', elem: innerType.elem, sizeExpr: { t: 'num', v: probe, isFloat: false, line: line } };
          if (innerType.elem.base === 'array' && !innerType.elem.sizeExpr) {
            var probe2 = item && item.list && item.list[0] && item.list[0].list ? item.list[0].list.length : 0;
            innerType.elem = { base: 'array', elem: innerType.elem.elem, sizeExpr: { t: 'num', v: probe2, isFloat: false, line: line } };
          }
        }
        arr.push(self.buildArray(innerType, item, env, line));
      } else {
        arr.push(item && item.expr ? convert(self.eval(item.expr, env), type.elem, line) : zeroOf(type.elem));
      }
    }
    return V('array', arr);
  };

  function zeroOf(type) {
    switch (type.base) {
      case 'int': return V('int', 0);
      case 'double': return V('double', 0);
      case 'bool': return V('bool', false);
      case 'char': return V('char', '\0');
      case 'string': return V('string', '');
      case 'auto': return V('int', 0);
      default: return V('int', 0);
    }
  }

  /* --- lvalue --- */
  Interpreter.prototype.getRef = function (node, env) {
    if (node.t === 'ident') {
      return { env: env, set: function (v) { env.set(node.name, v, node.line); } };
    }
    if (node.t === 'index') {
      var self = this;
      var objNode = node.obj;
      var container = this.eval(objNode, env);
      var idx = Math.trunc(num(this.eval(node.index, env)));
      if (container.type === 'array' || container.type === 'vector') {
        if (idx < 0 || idx >= container.val.length) {
          throw rerr(node.line, 'выход за границы: индекс ' + idx + ', а элементов ' + container.val.length + ' (нумерация с нуля)');
        }
        return {
          env: env, container: container,
          set: function (v) {
            var elemType = container.type === 'array' ? null : null;
            container.val[idx] = v;
          }
        };
      }
      if (container.type === 'string') {
        throw rerr(node.line, 'символ строки нельзя изменить через []; используй s = s.substr(…) или новую строку');
      }
      throw rerr(node.line, 'обращение по индексу работает с массивами, vector и string');
    }
    throw rerr(node.line, 'слева должно быть имя переменной');
  };

  Interpreter.prototype.eval = function (node, env) {
    this.tick(node.line);
    var self = this;
    switch (node.t) {
      case 'num': return node.isFloat ? V('double', node.v) : V('int', node.v);
      case 'str': return V('string', node.v);
      case 'chr': return V('char', node.v);
      case 'bool': return V('bool', node.v);
      case 'ident': {
        if (node.name === 'endl' || node.name === 'std::endl') return V('string', '\n');
        var v = env.get(node.name, node.line);
        return v;
      }
      case 'cond': return truthy(this.eval(node.cond, env)) ? this.eval(node.a, env) : this.eval(node.b, env);
      case 'cast': {
        var innerVal = this.eval(node.e, env);
        return convert(innerVal, node.type, node.line);
      }
      case 'unary': {
        var x = this.eval(node.e, env);
        if (node.op === '!') return V('bool', !truthy(x));
        if (node.op === '-') return x.type === 'double' ? V('double', -x.val) : V('int', -Math.trunc(num(x)));
        return x;
      }
      case 'incdec': {
        var ref = this.getRef(node.e, env);
        var cur = this.eval(node.e, env);
        var delta = node.op === '++' ? 1 : -1;
        var next = (cur.type === 'double') ? V('double', cur.val + delta) : V('int', Math.trunc(num(cur)) + delta);
        ref.set(next);
        return node.prefix ? next : cur;
      }
      case 'assign': {
        var ref2 = this.getRef(node.target, env);
        var val = this.eval(node.value, env);
        if (node.op === '=') {
          var curTarget = this.eval(node.target, env);
          var converted = convertToLike(val, curTarget);
          ref2.set(converted);
          return converted;
        }
        var cur = this.eval(node.target, env);
        var res = this.arith(node.op.charAt(0), cur, val, node.line);
        var conv = convertToLike(res, cur);
        ref2.set(conv);
        return conv;
      }
      case 'bin': return this.binop(node, env);
      case 'call': return this.callByName(node, env);
      case 'index': {
        var c = this.eval(node.obj, env);
        var i = Math.trunc(num(this.eval(node.index, env)));
        if (c.type === 'array' || c.type === 'vector') {
          if (i < 0 || i >= c.val.length) throw rerr(node.line, 'выход за границы: индекс ' + i + ', а элементов ' + c.val.length);
          return c.val[i];
        }
        if (c.type === 'string') {
          if (i < 0 || i >= c.val.length) throw rerr(node.line, 'выход за границы строки: индекс ' + i + ', длина ' + c.val.length);
          return V('char', c.val.charAt(i));
        }
        throw rerr(node.line, 'обращение по индексу работает с массивами, vector и string');
      }
      case 'method': return this.method(node, env);
      case 'cin': {
        for (var t = 0; t < node.targets.length; t++) {
          var target = node.targets[t];
          var ref3 = this.getRef(target, env);
          var curVal = this.eval(target, env);
          var tok = this.readToken(node.line);
          if (tok === null) return V('bool', false);
          var newVal;
          if (curVal.type === 'int') {
            if (!/^-?\d+$/.test(tok)) throw rerr(node.line, 'cin >> ' + target.name + ': ожидалось целое число, а во вводе «' + tok + '»');
            newVal = V('int', parseInt(tok, 10));
          } else if (curVal.type === 'double') {
            if (!/^-?\d+(\.\d+)?$/.test(tok)) throw rerr(node.line, 'cin >> ' + target.name + ': ожидалось число, а во вводе «' + tok + '»');
            newVal = V('double', parseFloat(tok));
          } else if (curVal.type === 'char') {
            newVal = V('char', String.fromCharCode(parseInt(tok, 10)));
          } else if (curVal.type === 'string') {
            newVal = V('string', tok);
          } else {
            throw rerr(node.line, 'cin не умеет читать в переменную этого типа');
          }
          ref3.set(newVal);
        }
        return V('bool', true);
      }
      default:
        throw rerr(node.line, 'внутренняя ошибка: неизвестное выражение ' + node.t);
    }
  };

  function convertToLike(val, like) {
    if (!like) return val;
    if (like.type === 'int') return V('int', Math.trunc(num(val)) || 0);
    if (like.type === 'double') return V('double', num(val));
    if (like.type === 'bool') return V('bool', truthy(val));
    if (like.type === 'char') return convert(val, { base: 'char' }, 0);
    if (like.type === 'string') return convert(val, { base: 'string' }, 0);
    return val;
  }

  Interpreter.prototype.arith = function (op, a, b, line) {
    if (a.type === 'string' || b.type === 'string') {
      if (op === '+') return V('string', fmt(a) + fmt(b));
      throw rerr(line, 'для строк определён только «+» (склейка)');
    }
    var isD = a.type === 'double' || b.type === 'double';
    var x = num(a), y = num(b);
    switch (op) {
      case '+': return isD ? V('double', x + y) : V('int', Math.trunc(x + y));
      case '-': return isD ? V('double', x - y) : V('int', Math.trunc(x - y));
      case '*': return isD ? V('double', x * y) : V('int', Math.trunc(x * y));
      case '/':
        if (y === 0) throw rerr(line, 'деление на ноль');
        return isD ? V('double', x / y) : V('int', Math.trunc(x / y));
      case '%':
        if (Math.trunc(y) === 0) throw rerr(line, 'остаток от деления на ноль');
        return V('int', Math.trunc(Math.trunc(x) % Math.trunc(y)));
      default: throw rerr(line, 'неизвестная операция ' + op);
    }
  };

  Interpreter.prototype.binop = function (node, env) {
    var op = node.op;
    if (op === '&&') {
      var l = this.eval(node.a, env);
      if (!truthy(l)) return V('bool', false);
      return V('bool', truthy(this.eval(node.b, env)));
    }
    if (op === '||') {
      var l2 = this.eval(node.a, env);
      if (truthy(l2)) return V('bool', true);
      return V('bool', truthy(this.eval(node.b, env)));
    }
    var a = this.eval(node.a, env), b = this.eval(node.b, env);
    if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%') return this.arith(op, a, b, node.line);
    var isStr = a.type === 'string' || b.type === 'string';
    var x = isStr ? fmt(a) : num(a), y = isStr ? fmt(b) : num(b);
    if (!isStr && (a.type === 'array' || a.type === 'vector' || b.type === 'array' || b.type === 'vector')) {
      throw rerr(node.line, 'массивы и vector нельзя сравнивать через ' + op);
    }
    switch (op) {
      case '==': return V('bool', x === y);
      case '!=': return V('bool', x !== y);
      case '<': return V('bool', x < y);
      case '>': return V('bool', x > y);
      case '<=': return V('bool', x <= y);
      case '>=': return V('bool', x >= y);
      default: throw rerr(node.line, 'неизвестная операция ' + op);
    }
  };

  Interpreter.prototype.method = function (node, env) {
    var obj = this.eval(node.obj, env);
    var args = node.args.map(function (a) { return this.eval(a, env); }, this);
    var name = node.name;
    if (obj.type === 'string') {
      if (name === 'size' || name === 'length') return V('int', obj.val.length);
      if (name === 'substr') {
        var start = Math.trunc(num(args[0]));
        var len = args.length > 1 ? Math.trunc(num(args[1])) : obj.val.length - start;
        return V('string', obj.val.substr(start, len));
      }
      if (name === 'empty') return V('bool', obj.val.length === 0);
      if (name === 'at') return V('char', obj.val.charAt(Math.trunc(num(args[0]))));
      if (name === 'find') {
        var pos = obj.val.indexOf(fmt(args[0]));
        return V('int', pos);
      }
      throw rerr(node.line, 'у string в этом тренажёре есть size(), length(), substr(), find(), at(), empty()');
    }
    if (obj.type === 'vector') {
      if (name === 'size') return V('int', obj.val.length);
      if (name === 'empty') return V('bool', obj.val.length === 0);
      if (name === 'push_back') {
        var elemType = { base: 'auto' };
        obj.val.push(args[0]);
        return V('void', null);
      }
      if (name === 'pop_back') { obj.val.pop(); return V('void', null); }
      if (name === 'clear') { obj.val.length = 0; return V('void', null); }
      if (name === 'at') {
        var i = Math.trunc(num(args[0]));
        if (i < 0 || i >= obj.val.length) throw rerr(node.line, 'at(): индекс ' + i + ' вне vector (длина ' + obj.val.length + ')');
        return obj.val[i];
      }
      throw rerr(node.line, 'у vector в этом тренажёре есть size(), push_back(), pop_back(), clear(), at(), empty()');
    }
    if (obj.type === 'array') {
      if (name === 'size') throw rerr(node.line, 'у обычного массива нет size(): размер фиксирован при объявлении');
    }
    throw rerr(node.line, 'у этого значения нет метода ' + name + '()');
  };

  Interpreter.prototype.callByName = function (node, env) {
    var name = node.name.replace(/^std::/, '');
    var self = this;
    var args = node.args.map(function (a) { return self.eval(a, env); });
    if (this.funcs[name]) return this.callFunction(this.funcs[name], args, node.line);
    if (BUILTINS[name]) {
      var res = BUILTINS[name].apply(null, args);
      return res === undefined ? V('void', null) : res;
    }
    throw rerr(node.line, 'нет функции «' + name + '» (объявлена ли она выше? в C++ функция должна быть известна до вызова)');
  };

  Interpreter.prototype.callFunction = function (fn, args, callLine) {
    if (args.length !== fn.params.length) {
      throw rerr(callLine, 'функция ' + fn.name + ' ждёт ' + fn.params.length + ' аргумент(ов), а получила ' + args.length);
    }
    this.depth++;
    if (this.depth > 700) { this.depth = 0; throw rerr(callLine, 'слишком глубокая рекурсия (больше 700 вложенных вызовов) — проверь условие выхода'); }
    var env = new Env(this.globalEnv);
    for (var i = 0; i < fn.params.length; i++) {
      env.vars[fn.params[i].name] = convert(args[i], fn.params[i].type, callLine);
    }
    var sig = this.execBlock(fn.body, env);
    this.depth--;
    if (sig && sig.flow === 'return') {
      var v = sig.value || V('void', null);
      if (fn.retType.base !== 'void') return convert(v, fn.retType, callLine);
      return v;
    }
    if (fn.retType.base !== 'void' && fn.name !== 'main') {
      throw rerr(fn.line, 'функция ' + fn.name + ' должна вернуть значение типа ' + fn.retType.base + ', а дошла до конца без return');
    }
    return V('void', null);
  };

  Interpreter.prototype.execBlock = function (node, parent) {
    var env = new Env(parent);
    for (var i = 0; i < node.stmts.length; i++) {
      var sig = this.exec(node.stmts[i], env);
      if (sig) return sig;
    }
    return null;
  };

  Interpreter.prototype.exec = function (node, env) {
    this.tick(node.line);
    var self = this;
    switch (node.t) {
      case 'empty': return null;
      case 'block': return this.execBlock(node, env);
      case 'decl':
        node.decls.forEach(function (d) { self.declare(d, env); });
        return null;
      case 'expr': this.eval(node.e, env); return null;
      case 'cout':
        node.items.forEach(function (it) { self.out += fmt(self.eval(it, env)); });
        return null;
      case 'if':
        if (truthy(this.eval(node.cond, env))) return this.exec(node.then, env);
        else if (node.else) return this.exec(node.else, env);
        return null;
      case 'while': {
        var guard = 0;
        while (truthy(this.eval(node.cond, env))) {
          var sig = this.exec(node.body, env);
          if (sig) {
            if (sig.flow === 'break') break;
            if (sig.flow === 'return') return sig;
          }
          if (++guard > 5000000) throw rerr(node.line, 'цикл выполнился слишком много раз');
        }
        return null;
      }
      case 'do': {
        while (true) {
          var sig2 = this.exec(node.body, env);
          if (sig2) {
            if (sig2.flow === 'break') break;
            if (sig2.flow === 'return') return sig2;
          }
          if (!truthy(this.eval(node.cond, env))) break;
        }
        return null;
      }
      case 'for': {
        var loopEnv = new Env(env);
        if (node.init) this.exec(node.init, loopEnv);
        while (node.cond === null || truthy(this.eval(node.cond, loopEnv))) {
          var sig3 = this.exec(node.body, loopEnv);
          if (sig3) {
            if (sig3.flow === 'break') break;
            if (sig3.flow === 'return') return sig3;
          }
          if (node.step) this.eval(node.step, loopEnv);
        }
        return null;
      }
      case 'break': return { flow: 'break' };
      case 'continue': return { flow: 'continue' };
      case 'return': return { flow: 'return', value: node.e ? this.eval(node.e, env) : V('void', null) };
      default:
        throw rerr(node.line, 'внутренняя ошибка: неизвестный оператор ' + node.t);
    }
  };

  /* ------------------------------- API ---------------------------------- */
  function compile(src) {
    return new Parser(tokenize(src)).parseProgram();
  }

  function run(src, stdinText) {
    try {
      var prog = compile(src);
      var interp = new Interpreter(prog, stdinText);
      var out = interp.run();
      return { ok: true, output: out, compileError: null, runtimeError: null };
    } catch (e) {
      if (e && e.name === 'CompileError') return { ok: false, output: '', compileError: { line: e.line, message: e.message } };
      if (e && e.name === 'RuntimeError') return { ok: false, output: '', runtimeError: { line: e.line, message: e.message } };
      if (e instanceof RangeError || (e && e.message && /call stack/i.test(e.message))) {
        return { ok: false, output: '', runtimeError: { line: 0, message: 'слишком глубокая рекурсия — функция вызывает себя без условия выхода' } };
      }
      return { ok: false, output: '', runtimeError: { line: 0, message: e && e.message ? e.message : String(e) } };
    }
  }

  global.CppEngine = { run: run, compile: compile, tokenize: tokenize };
})(typeof window !== 'undefined' ? window : globalThis);
