/* ==========================================================================
   CppEngine — интерпретатор учебного подмножества C++ на JavaScript.
   Без WebAssembly и без сети: лексер → парсер → дерево → вычисление.

   Поддержано: #include/using (игнорируются), int/long/double/float/char/bool/
   string/auto, массивы и vector, if/else, for, while, do-while, break/continue,
   функции (включая рекурсию), cout << / cin >>, арифметика с типами как в C++
   (целочисленное деление, переполнения нет), методы string и vector,
   библиотечные abs/sqrt/pow/min/max/floor/ceil/round/to_string.
   ========================================================================== */
(function (G) {
  'use strict';

  function CppError(msg, line) {
    var e = new Error(msg);
    e.isCpp = true;
    e.line = line || 0;
    return e;
  }

  var KEYWORDS = ('int long short unsigned signed double float char bool void auto const string vector ' +
    'if else for while do break continue return true false struct class using namespace static inline ' +
    'switch case default goto sizeof').split(' ');
  var KW = {};
  KEYWORDS.forEach(function (k) { KW[k] = true; });

  var TYPE_NAMES = { int: 1, long: 1, short: 1, unsigned: 1, signed: 1, double: 1, float: 1, char: 1, bool: 1, auto: 1, void: 1, string: 1 };

  /* ------------------------------- лексер ------------------------------- */
  var OPS2 = ['<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '->', '::'];

  function tokenize(src) {
    var toks = [], i = 0, line = 1, n = src.length;
    function push(type, value, ln) { toks.push({ type: type, value: value, line: ln }); }

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
      if (c === '#') {
        while (i < n && src[i] !== '\n') {
          if (src[i] === '\\' && src[i + 1] === '\n') { line++; i += 2; continue; }
          i++;
        }
        continue;
      }

      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        var start = i, isFloat = false;
        while (i < n && /[0-9]/.test(src[i])) i++;
        if (src[i] === '.') { isFloat = true; i++; while (i < n && /[0-9]/.test(src[i])) i++; }
        if (src[i] === 'e' || src[i] === 'E') {
          isFloat = true; i++;
          if (src[i] === '+' || src[i] === '-') i++;
          while (i < n && /[0-9]/.test(src[i])) i++;
        }
        var text = src.slice(start, i);
        while (i < n && /[fFlLuU]/.test(src[i])) { if (/[fF]/.test(src[i])) isFloat = true; i++; }
        push(isFloat ? 'NUMF' : 'NUM', Number(text), line);
        continue;
      }

      if (c === '"' || c === "'") {
        var quote = c, out = '', startLine = line;
        i++;
        while (i < n && src[i] !== quote) {
          if (src[i] === '\\') {
            var esc = src[i + 1];
            out += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc === '0' ? '\0' : esc === '\\' ? '\\'
              : esc === '"' ? '"' : esc === "'" ? "'" : esc === '\n' ? (line++, '') : esc;
            i += 2; continue;
          }
          if (src[i] === '\n') throw CppError('строка или символ не закрыты на этой строке', startLine);
          out += src[i]; i++;
        }
        if (i >= n) throw CppError('строка или символ не закрыты', startLine);
        i++;
        push(quote === '"' ? 'STRING' : 'CHAR', out, startLine);
        continue;
      }

      if (/[A-Za-z_]/.test(c)) {
        var s0 = i;
        while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
        var word = src.slice(s0, i);
        push(KW[word] ? 'KW' : 'IDENT', word, line);
        continue;
      }

      var two = src.substr(i, 2);
      if (OPS2.indexOf(two) >= 0) { push('OP', two, line); i += 2; continue; }

      if ('+-*/%(){}[];,<>=!?:.&|^~'.indexOf(c) >= 0) { push('OP', c, line); i++; continue; }

      throw CppError('непонятный символ «' + c + '»', line);
    }
    toks.push({ type: 'EOF', value: '', line: line });
    return toks;
  }

  /* ------------------------------- парсер ------------------------------- */
  function Parser(toks) { this.toks = toks; this.i = 0; }

  Parser.prototype.cur = function () { return this.toks[this.i]; };
  Parser.prototype.peek = function (k) { return this.toks[this.i + (k || 1)]; };
  Parser.prototype.next = function () { return this.toks[this.i++]; };
  Parser.prototype.isOp = function (v) { var t = this.cur(); return t.type === 'OP' && t.value === v; };
  Parser.prototype.isKw = function (v) { var t = this.cur(); return t.type === 'KW' && t.value === v; };
  Parser.prototype.acceptOp = function (v) { if (this.isOp(v)) { this.i++; return true; } return false; };
  Parser.prototype.acceptKw = function (v) { if (this.isKw(v)) { this.i++; return true; } return false; };
  Parser.prototype.expectOp = function (v) {
    if (!this.isOp(v)) {
      var t = this.cur();
      throw CppError('ожидалось «' + v + '», а встретилось «' + (t.value === '' ? 'конец файла' : t.value) + '»', t.line);
    }
    this.i++;
  };
  Parser.prototype.expectIdent = function () {
    var t = this.cur();
    if (t.type !== 'IDENT') throw CppError('ожидалось имя, а встретилось «' + (t.value === '' ? 'конец файла' : t.value) + '»', t.line);
    this.i++;
    return t.value;
  };

  Parser.prototype.parseProgram = function () {
    var body = [];
    while (this.cur().type !== 'EOF') {
      if (this.isKw('using') || this.isKw('typedef')) { while (!this.isOp(';') && this.cur().type !== 'EOF') this.next(); this.next(); continue; }
      if (this.isKw('struct') || this.isKw('class')) throw CppError('свои структуры (struct/class) в этом тренажёре не поддерживаются', this.cur().line);
      if (this.isOp(';')) { this.next(); continue; }

      var save = this.i;
      var ty = this.parseType();
      var t = this.cur();
      if (ty && t.type === 'IDENT' && this.peek().type === 'OP' && this.peek().value === '(') {
        body.push(this.parseFunction(ty));
        continue;
      }
      this.i = save;
      body.push(this.parseSimple());
    }
    return { type: 'Program', body: body };
  };

  Parser.prototype.parseType = function () {
    var isConst = false, guard = 0;
    while (this.isKw('const') || this.isKw('unsigned') || this.isKw('signed') || this.isKw('long') || this.isKw('short')) {
      if (this.isKw('const')) isConst = true;
      this.next();
      if (++guard > 4) break;
    }
    var t = this.cur();
    if (t.type === 'IDENT' && t.value === 'std' && this.peek().type === 'OP' && this.peek().value === '::') { this.next(); this.next(); t = this.cur(); }
    if ((t.type === 'IDENT' || t.type === 'KW') && t.value === 'vector') {
      this.next();
      this.expectOp('<');
      var elem = this.parseType();
      if (!elem) throw CppError('внутри vector<…> нужен тип, например vector<int>', this.cur().line);
      this.expectOp('>');
      return { name: 'vector', elem: elem, isConst: isConst };
    }
    if (t.type === 'KW' && TYPE_NAMES[t.value]) {
      this.next();
      var name = t.value;
      if (name === 'float') name = 'double';
      if (name === 'long' || name === 'short' || name === 'unsigned' || name === 'signed') name = 'int';
      if (name === 'void' && isConst) return null;
      return { name: name, isConst: isConst };
    }
    if (t.type === 'IDENT' && t.value === 'size_t') { this.next(); return { name: 'int', isConst: isConst }; }
    return null;
  };

  Parser.prototype.parseFunction = function (retType) {
    var line = this.cur().line;
    var name = this.expectIdent();
    this.expectOp('(');
    var params = [];
    if (!this.isOp(')')) {
      do {
        var pt = this.parseType();
        if (!pt) throw CppError('в параметрах функции нужен тип, например int x', this.cur().line);
        var pname = this.expectIdent();
        if (this.isOp('[')) { this.next(); if (!this.isOp(']')) this.parseExpr(); this.expectOp(']'); pt = { name: 'array', elem: pt }; }
        params.push({ type: pt, name: pname });
      } while (this.acceptOp(','));
    }
    this.expectOp(')');
    if (this.acceptOp(';')) return { type: 'FuncProto', name: name, line: line };
    var body = this.parseBlock();
    return { type: 'Func', name: name, params: params, ret: retType, body: body, line: line };
  };

  Parser.prototype.parseBlock = function () {
    var line = this.cur().line;
    this.expectOp('{');
    var body = [];
    while (!this.isOp('}')) {
      if (this.cur().type === 'EOF') throw CppError('не хватает закрывающей скобки «}»', this.cur().line);
      body.push(this.parseStmt());
    }
    this.expectOp('}');
    return { type: 'Block', body: body, line: line };
  };

  Parser.prototype.tryParseDecl = function () {
    var save = this.i;
    var ty = null;
    try { ty = this.parseType(); } catch (e) { this.i = save; return null; }
    if (!ty) { this.i = save; return null; }
    var t = this.cur();
    if (t.type !== 'IDENT') { this.i = save; return null; }
    var decl = this.parseDeclRest(ty);
    return decl;
  };

  Parser.prototype.parseDeclRest = function (ty) {
    var line = this.cur().line, decls = [];
    do {
      var name = this.expectIdent();
      var d = { name: name, init: null, dims: null, arrInit: null };
      if (this.isOp('[')) {
        d.dims = [];
        while (this.isOp('[')) {
          this.next();
          d.dims.push(this.isOp(']') ? null : this.parseExpr());
          this.expectOp(']');
        }
        if (this.isOp('=')) { this.next(); if (this.isOp('{')) d.arrInit = this.parseInitList(); else d.init = this.parseAssign(); }
      } else if (this.isOp('=')) {
        this.next();
        d.init = this.isOp('{') ? this.parseInitList() : this.parseAssign();
      } else if (this.isOp('{')) {
        d.arrInit = this.parseInitList();
      }
      decls.push(d);
    } while (this.acceptOp(','));
    this.expectOp(';');
    return { type: 'Decl', ty: ty, decls: decls, line: line };
  };

  Parser.prototype.parseInitList = function () {
    var line = this.cur().line;
    this.expectOp('{');
    var items = [];
    if (!this.isOp('}')) {
      do { items.push(this.isOp('{') ? this.parseInitList() : this.parseAssign()); } while (this.acceptOp(','));
    }
    this.expectOp('}');
    return { type: 'InitList', items: items, line: line };
  };

  Parser.prototype.parseSimple = function () {
    var d = this.tryParseDecl();
    if (d) return d;
    var line = this.cur().line;
    var e = this.parseExpr();
    this.expectOp(';');
    return { type: 'ExprStmt', value: e, line: line };
  };

  Parser.prototype.parseStmt = function () {
    var t = this.cur(), line = t.line;

    if (this.isOp('{')) return this.parseBlock();
    if (this.isOp(';')) { this.next(); return { type: 'Empty', line: line }; }

    if (this.isKw('if')) {
      this.next(); this.expectOp('(');
      var cond = this.parseExpr();
      this.expectOp(')');
      var thenS = this.parseStmt();
      var elseS = null;
      if (this.acceptKw('else')) elseS = this.parseStmt();
      return { type: 'If', cond: cond, then: thenS, els: elseS, line: line };
    }
    if (this.isKw('for')) {
      this.next(); this.expectOp('(');
      var init = null;
      if (this.isOp(';')) this.next();
      else {
        init = this.tryParseDecl();
        if (!init) { init = { type: 'ExprStmt', value: this.parseExpr(), line: line }; this.expectOp(';'); }
      }
      var fc = this.isOp(';') ? null : this.parseExpr();
      this.expectOp(';');
      var step = this.isOp(')') ? null : this.parseExpr();
      this.expectOp(')');
      var fbody = this.parseStmt();
      return { type: 'For', init: init, cond: fc, step: step, body: fbody, line: line };
    }
    if (this.isKw('while')) {
      this.next(); this.expectOp('(');
      var wc = this.parseExpr();
      this.expectOp(')');
      var wb = this.parseStmt();
      return { type: 'While', cond: wc, body: wb, line: line };
    }
    if (this.isKw('do')) {
      this.next();
      var db = this.parseStmt();
      if (!this.acceptKw('while')) throw CppError('после тела do нужен while (…)', this.cur().line);
      this.expectOp('(');
      var dc = this.parseExpr();
      this.expectOp(')');
      this.expectOp(';');
      return { type: 'DoWhile', cond: dc, body: db, line: line };
    }
    if (this.isKw('return')) {
      this.next();
      if (this.isOp(';')) { this.next(); return { type: 'Return', value: null, line: line }; }
      var rv = this.parseExpr();
      this.expectOp(';');
      return { type: 'Return', value: rv, line: line };
    }
    if (this.isKw('break')) { this.next(); this.expectOp(';'); return { type: 'Break', line: line }; }
    if (this.isKw('continue')) { this.next(); this.expectOp(';'); return { type: 'Continue', line: line }; }
    if (this.isKw('switch') || this.isKw('goto') || this.isKw('struct') || this.isKw('class')) {
      throw CppError('конструкция «' + t.value + '» в этом тренажёре не поддерживается — используй if/else или функцию', line);
    }
    if (this.isKw('static') || this.isKw('inline')) { this.next(); return this.parseStmt(); }

    // cout / cin
    var isCout = (t.type === 'IDENT' && t.value === 'cout');
    var isCin = (t.type === 'IDENT' && t.value === 'cin');
    if (t.type === 'IDENT' && t.value === 'std' && this.peek().type === 'OP' && this.peek().value === '::') {
      var after = this.toks[this.i + 2];
      if (after && after.type === 'IDENT' && (after.value === 'cout' || after.value === 'cin')) {
        isCout = after.value === 'cout';
        isCin = after.value === 'cin';
      }
    }
    if (isCout) {
      if (t.value === 'std') { this.next(); this.next(); }
      this.next();
      var parts = [];
      while (this.isOp('<<')) {
        this.next();
        var tt = this.cur();
        if (tt.type === 'IDENT' && tt.value === 'endl') { this.next(); parts.push({ k: 'endl' }); continue; }
        parts.push({ k: 'expr', e: this.parseAdd() });
      }
      this.expectOp(';');
      return { type: 'Cout', parts: parts, line: line };
    }
    if (isCin) {
      if (t.value === 'std') { this.next(); this.next(); }
      this.next();
      var targets = [];
      while (this.isOp('>>')) {
        this.next();
        targets.push(this.parseUnary());
      }
      this.expectOp(';');
      return { type: 'Cin', targets: targets, line: line };
    }

    var d2 = this.tryParseDecl();
    if (d2) return d2;
    var e2 = this.parseExpr();
    this.expectOp(';');
    return { type: 'ExprStmt', value: e2, line: line };
  };

  /* ----------------------------- выражения ----------------------------- */
  Parser.prototype.parseExpr = function () { return this.parseAssign(); };

  Parser.prototype.parseAssign = function () {
    var line = this.cur().line;
    var left = this.parseTernary();
    var t = this.cur();
    if (t.type === 'OP' && ['=', '+=', '-=', '*=', '/=', '%='].indexOf(t.value) >= 0) {
      this.next();
      var right = this.parseAssign();
      return { type: 'Assign', op: t.value, target: left, value: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseTernary = function () {
    var line = this.cur().line;
    var c = this.parseOr();
    if (this.isOp('?')) {
      this.next();
      var a = this.parseAssign();
      this.expectOp(':');
      var b = this.parseAssign();
      return { type: 'Ternary', cond: c, a: a, b: b, line: line };
    }
    return c;
  };

  Parser.prototype.binLevel = function (ops, next) {
    var self = this;
    return function () {
      var line = self.cur().line;
      var left = next.call(self);
      while (self.cur().type === 'OP' && ops.indexOf(self.cur().value) >= 0) {
        var op = self.next().value;
        var right = next.call(self);
        left = { type: 'Bin', op: op, l: left, r: right, line: line };
      }
      return left;
    };
  };

  Parser.prototype.parseOr = null; // назначаются ниже

  Parser.prototype.parseMultiplicative = function () {
    var line = this.cur().line;
    var left = this.parseUnary();
    while (this.cur().type === 'OP' && ['*', '/', '%'].indexOf(this.cur().value) >= 0) {
      var op = this.next().value;
      var right = this.parseUnary();
      left = { type: 'Bin', op: op, l: left, r: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseAdd = function () {
    var line = this.cur().line;
    var left = this.parseMultiplicative();
    while (this.cur().type === 'OP' && ['+', '-'].indexOf(this.cur().value) >= 0) {
      var op = this.next().value;
      var right = this.parseMultiplicative();
      left = { type: 'Bin', op: op, l: left, r: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseShift = function () {
    var line = this.cur().line;
    var left = this.parseAdd();
    while (this.cur().type === 'OP' && ['<<', '>>'].indexOf(this.cur().value) >= 0) {
      var op = this.next().value;
      var right = this.parseAdd();
      left = { type: 'Bin', op: op, l: left, r: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseRel = function () {
    var line = this.cur().line;
    var left = this.parseShift();
    while (this.cur().type === 'OP' && ['<', '>', '<=', '>='].indexOf(this.cur().value) >= 0) {
      var op = this.next().value;
      var right = this.parseShift();
      left = { type: 'Bin', op: op, l: left, r: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseEq = function () {
    var line = this.cur().line;
    var left = this.parseRel();
    while (this.cur().type === 'OP' && ['==', '!='].indexOf(this.cur().value) >= 0) {
      var op = this.next().value;
      var right = this.parseRel();
      left = { type: 'Bin', op: op, l: left, r: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseAnd = function () {
    var line = this.cur().line;
    var left = this.parseEq();
    while (this.isOp('&&')) {
      this.next();
      var right = this.parseEq();
      left = { type: 'Bin', op: '&&', l: left, r: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseOr = function () {
    var line = this.cur().line;
    var left = this.parseAnd();
    while (this.isOp('||')) {
      this.next();
      var right = this.parseAnd();
      left = { type: 'Bin', op: '||', l: left, r: right, line: line };
    }
    return left;
  };

  Parser.prototype.parseUnary = function () {
    var line = this.cur().line;
    if (this.isOp('(')) {
      var save = this.i;
      this.next();
      var castTy = null;
      try { castTy = this.parseType(); } catch (e) { castTy = null; }
      if (castTy && this.isOp(')')) {
        this.next();
        return { type: 'Cast', ty: castTy, value: this.parseUnary(), line: line };
      }
      this.i = save;
    }
    if (this.isOp('!')) { this.next(); return { type: 'Un', op: '!', value: this.parseUnary(), line: line }; }
    if (this.isOp('-')) { this.next(); return { type: 'Un', op: '-', value: this.parseUnary(), line: line }; }
    if (this.isOp('+')) { this.next(); return this.parseUnary(); }
    if (this.isOp('++')) { this.next(); return { type: 'IncDec', op: '++', value: this.parseUnary(), prefix: true, line: line }; }
    if (this.isOp('--')) { this.next(); return { type: 'IncDec', op: '--', value: this.parseUnary(), prefix: true, line: line }; }
    if (this.isOp('&')) { this.next(); return this.parseUnary(); }  // ссылки не поддерживаем, читаем значение
    return this.parsePostfix();
  };

  Parser.prototype.parsePostfix = function () {
    var node = this.parsePrimary();
    for (;;) {
      var t = this.cur();
      if (t.type === 'OP' && t.value === '[') {
        this.next();
        var idx = this.parseExpr();
        this.expectOp(']');
        node = { type: 'Index', obj: node, index: idx, line: t.line };
        continue;
      }
      if (t.type === 'OP' && t.value === '(') {
        this.next();
        var args = [];
        if (!this.isOp(')')) { do { args.push(this.parseAssign()); } while (this.acceptOp(',')); }
        this.expectOp(')');
        node = { type: 'Call', callee: node, args: args, line: t.line };
        continue;
      }
      if (t.type === 'OP' && t.value === '.') {
        this.next();
        var meth = this.cur();
        if (meth.type !== 'IDENT') throw CppError('после точки ожидалось имя метода', meth.line);
        this.next();
        node = { type: 'Member', obj: node, name: meth.value, line: t.line };
        continue;
      }
      if (t.type === 'OP' && (t.value === '++' || t.value === '--')) {
        this.next();
        node = { type: 'IncDec', op: t.value, value: node, prefix: false, line: t.line };
        continue;
      }
      return node;
    }
  };

  Parser.prototype.parsePrimary = function () {
    var t = this.cur();
    if (t.type === 'NUM') { this.next(); return { type: 'Num', value: t.value, isFloat: false, line: t.line }; }
    if (t.type === 'NUMF') { this.next(); return { type: 'Num', value: t.value, isFloat: true, line: t.line }; }
    if (t.type === 'STRING') { this.next(); return { type: 'Str', value: t.value, line: t.line }; }
    if (t.type === 'CHAR') { this.next(); return { type: 'Char', value: t.value, line: t.line }; }
    if (t.type === 'KW' && (t.value === 'true' || t.value === 'false')) {
      this.next(); return { type: 'Bool', value: t.value === 'true', line: t.line };
    }
    if (t.type === 'KW' && t.value === 'sizeof') throw CppError('sizeof в этом тренажёре не поддерживается', t.line);
    if (t.type === 'IDENT') {
      this.next();
      var name = t.value;
      if (name === 'std' && this.isOp('::')) { this.next(); name = this.expectIdent(); }
      return { type: 'Name', id: name, line: t.line };
    }
    if (this.isOp('(')) {
      this.next();
      var e = this.parseExpr();
      this.expectOp(')');
      return e;
    }
    if (this.isOp('{')) return this.parseInitList();
    throw CppError('неожиданное «' + (t.value === '' ? 'конец файла' : t.value) + '» в выражении', t.line);
  };

  /* ----------------------------- значения ----------------------------- */
  function V(t, v) { return { t: t, v: v }; }
  function isNumType(t) { return t === 'int' || t === 'double' || t === 'char' || t === 'bool'; }
  function typeLabel(t) { return t === 'array' ? 'массив' : t === 'vector' ? 'vector' : t; }

  function fmtDouble(x) {
    if (!isFinite(x)) return x > 0 ? 'inf' : (x < 0 ? '-inf' : 'nan');
    if (Number.isInteger(x) && Math.abs(x) < 1e15) return String(x);
    var s = x.toPrecision(6);
    if (s.indexOf('e') >= 0) return String(Number(s));
    return String(Number(s));
  }

  /* ---------------------------- интерпретатор ---------------------------- */
  function Interp(program) {
    this.funcs = {};
    this.globals = { vars: Object.create(null), parent: null };
    this.out = [];
    this.steps = 0;
    this.depth = 0;
    this.stdinTokens = [];
    this.stdinPos = 0;
    this.program = program;
  }

  Interp.prototype.tick = function (line) {
    if (++this.steps > 4000000) throw CppError('программа выполняется слишком долго — похоже на бесконечный цикл', line);
  };

  Interp.prototype.declare = function (scope, name, value, isConst, line) {
    if (scope.vars[name]) throw CppError('переменная «' + name + '» уже объявлена в этой области', line);
    scope.vars[name] = { value: value, isConst: !!isConst };
  };

  Interp.prototype.findVar = function (scope, name, line) {
    var s = scope;
    while (s) {
      if (s.vars[name]) return { scope: s, slot: s.vars[name] };
      s = s.parent;
    }
    throw CppError('неизвестная переменная «' + name + '» — она не объявлена', line);
  };

  Interp.prototype.readVar = function (scope, name, line) {
    var f = this.findVar(scope, name, line);
    if (f.slot.value === null) throw CppError('переменная «' + name + '» объявлена, но ещё не получила значение', line);
    return f.slot.value;
  };

  Interp.prototype.defaultValue = function (ty) {
    if (ty.name === 'string') return V('string', '');
    if (ty.name === 'bool') return V('bool', false);
    if (ty.name === 'char') return V('char', '\0');
    if (ty.name === 'double') return V('double', 0);
    return V('int', 0);
  };

  Interp.prototype.coerce = function (value, ty, line) {
    if (ty.name === 'auto' || !ty.name) return value;
    if (ty.name === 'array' || ty.name === 'vector') return value;
    if (ty.name === 'string') {
      if (value.t === 'string') return value;
      if (value.t === 'char') return V('string', String(value.v));
      throw CppError('в string нельзя положить ' + typeLabel(value.t), line);
    }
    if (ty.name === 'bool') {
      if (value.t === 'bool') return value;
      if (isNumType(value.t)) return V('bool', numOf(value) !== 0);
      throw CppError('в bool нельзя положить ' + typeLabel(value.t), line);
    }
    if (ty.name === 'char') {
      if (value.t === 'char') return value;
      if (isNumType(value.t)) return V('char', String.fromCharCode(Math.trunc(numOf(value))));
      throw CppError('в char нельзя положить ' + typeLabel(value.t), line);
    }
    if (ty.name === 'double') {
      if (!isNumType(value.t)) throw CppError('в double нельзя положить ' + typeLabel(value.t), line);
      return V('double', numOf(value));
    }
    // int
    if (!isNumType(value.t)) throw CppError('в int нельзя положить ' + typeLabel(value.t), line);
    return V('int', Math.trunc(numOf(value)));
  };

  function numOf(v) {
    if (v.t === 'char') return v.v.length ? v.v.codePointAt(0) : 0;
    if (v.t === 'bool') return v.v ? 1 : 0;
    return v.v;
  }

  Interp.prototype.valueOfType = function (typeName) {
    return typeName === 'string' ? V('string', '') : typeName === 'bool' ? V('bool', false) : V('int', 0);
  };

  /* --- выполнение --- */
  Interp.prototype.runProgram = function (input) {
    this.stdinTokens = String(input || '').split(/\s+/).filter(function (s) { return s.length > 0; });
    var body = this.program.body;

    body.forEach(function (node) {
      if (node.type === 'Func') this.funcs[node.name] = node;
    }, this);
    // глобальные переменные
    body.forEach(function (node) {
      if (node.type === 'Decl') this.execDecl(node, this.globals);
    }, this);
    body.forEach(function (node) {
      if (node.type === 'Func' || node.type === 'Decl' || node.type === 'FuncProto') return;
      this.exec(node, this.globals);
    }, this);

    var main = this.funcs['main'];
    if (!main) throw CppError('в программе нет функции main() — с неё начинается любая программа на C++', 1);
    this.callUser(main, [], 1);
    return this.out.join('');
  };

  Interp.prototype.exec = function (node, scope) {
    this.tick(node.line);
    switch (node.type) {
      case 'Block': {
        var inner = { vars: Object.create(null), parent: scope };
        for (var i = 0; i < node.body.length; i++) {
          var sig = this.exec(node.body[i], inner);
          if (sig) return sig;
        }
        return null;
      }
      case 'Empty': case 'Func': case 'FuncProto': return null;
      case 'Decl': this.execDecl(node, scope); return null;
      case 'ExprStmt': this.eval(node.value, scope); return null;
      case 'Cout': this.execCout(node, scope); return null;
      case 'Cin': this.execCin(node, scope); return null;
      case 'If': {
        var c = this.eval(node.cond, scope);
        if (truthy(c)) return this.exec(node.then, scope);
        if (node.els) return this.exec(node.els, scope);
        return null;
      }
      case 'While': {
        while (truthy(this.eval(node.cond, scope))) {
          this.tick(node.line);
          var s = this.exec(node.body, scope);
          if (s && s.sig === 'break') break;
          if (s && s.sig === 'return') return s;
        }
        return null;
      }
      case 'DoWhile': {
        do {
          this.tick(node.line);
          var s2 = this.exec(node.body, scope);
          if (s2 && s2.sig === 'break') break;
          if (s2 && s2.sig === 'return') return s2;
        } while (truthy(this.eval(node.cond, scope)));
        return null;
      }
      case 'For': {
        var fscope = { vars: Object.create(null), parent: scope };
        if (node.init) {
          if (node.init.type === 'Decl') this.execDecl(node.init, fscope);
          else this.eval(node.init.value, fscope);
        }
        for (;;) {
          this.tick(node.line);
          if (node.cond && !truthy(this.eval(node.cond, fscope))) break;
          var s3 = this.exec(node.body, fscope);
          if (s3 && s3.sig === 'break') break;
          if (s3 && s3.sig === 'return') return s3;
          if (node.step) this.eval(node.step, fscope);
        }
        return null;
      }
      case 'Return': {
        var val = node.value ? this.eval(node.value, scope) : V('void', null);
        return { sig: 'return', value: val };
      }
      case 'Break': return { sig: 'break' };
      case 'Continue': return { sig: 'continue' };
      case 'InitList': return null;
      default:
        throw CppError('внутренняя ошибка: неизвестная конструкция ' + node.type, node.line);
    }
  };

  Interp.prototype.execDecl = function (_node, scope) {
    var self = this;
    _node.decls.forEach(function (d) {
      var ty = _node.ty;
      var value;
      if (d.dims && d.dims.length) {
        value = self.buildArray(ty.name === 'vector' ? ty.elem : ty, d.dims, scope, d.arrInit, _node.line);
        if (ty.name === 'vector') throw CppError('vector не объявляют квадратными скобками — используй vector<int> v; и v.push_back(x)', _node.line);
      } else if (d.arrInit && d.arrInit.type === 'InitList') {
        var elemTy = ty.name === 'vector' ? ty.elem : ty;
        if (elemTy && elemTy.name === 'auto' && d.arrInit.items.length) elemTy = self.inferType(d.arrInit.items[0]);
        var items = d.arrInit.items.map(function (it) { return self.coerce(self.eval(it, scope), elemTy || { name: 'int' }, it.line); });
        value = V(ty.name === 'vector' ? 'vector' : 'array', items);
      } else if (ty.name === 'vector' || ty.name === 'array') {
        value = V(ty.name, []);
      } else if (d.init) {
        var inv = self.eval(d.init, scope);
        if (ty.name === 'auto') value = inv;
        else value = self.coerce(inv, ty, d.line || _node.line);
      } else {
        value = ty.name === 'auto' ? null : self.defaultValue(ty);
      }
      self.declare(scope, d.name, value, ty.isConst, _node.line);
    });
  };

  Interp.prototype.buildArray = function (elemTy, dims, scope, initNode, line, level) {
    level = level || 0;
    var self = this;
    var len;
    if (dims[level]) len = Math.trunc(numOf(this.eval(dims[level], scope)));
    else if (initNode && initNode.type === 'InitList') len = initNode.items.length;
    else throw CppError('у массива нужно указать размер: int a[10];', line);
    if (len < 0) throw CppError('размер массива не может быть отрицательным', line);
    if (len > 100000) throw CppError('слишком большой массив для тренажёра (максимум 100000)', line);
    var items = [];
    var last = level === dims.length - 1;
    for (var i = 0; i < len; i++) {
      var sub = (initNode && initNode.type === 'InitList') ? initNode.items[i] : null;
      if (last) {
        if (sub) items.push(this.coerce(this.evalInitValue(sub, scope), elemTy || { name: 'int' }, line));
        else items.push(this.defaultValue(elemTy || { name: 'int' }));
      } else {
        items.push(this.buildArray(elemTy, dims, scope, sub, line, level + 1));
      }
    }
    return V('array', items);
  };

  Interp.prototype.evalInitValue = function (node, scope) {
    if (node.type === 'InitList') {
      var self = this;
      return V('array', node.items.map(function (it) { return self.evalInitValue(it, scope); }).map(function (v) { return v; }));
    }
    return this.eval(node, scope);
  };

  Interp.prototype.inferType = function (initNode) {
    if (!initNode) return { name: 'int' };
    if (initNode.type === 'Str') return { name: 'string' };
    if (initNode.type === 'Char') return { name: 'char' };
    if (initNode.type === 'Bool') return { name: 'bool' };
    if (initNode.type === 'Num') return { name: initNode.isFloat ? 'double' : 'int' };
    return { name: 'int' };
  };

  Interp.prototype.execCout = function (node, scope) {
    var self = this;
    node.parts.forEach(function (p) {
      if (p.k === 'endl') { self.out.push('\n'); return; }
      var v = self.eval(p.e, scope);
      self.out.push(fmtValue(v, p.e.line));
    });
  };

  Interp.prototype.execCin = function (node, scope) {
    for (var i = 0; i < node.targets.length; i++) {
      var tgt = node.targets[i];
      if (this.stdinPos >= this.stdinTokens.length) {
        throw CppError('cin ждёт данные, но ввод закончился — проверь, сколько чисел вводится', tgt.line || node.line);
      }
      var raw = this.stdinTokens[this.stdinPos++];
      var cur = this.getLValue(tgt, scope);
      var ty = cur.value ? cur.value.t : 'int';
      var newVal;
      if (ty === 'string') newVal = V('string', raw);
      else if (ty === 'char') newVal = V('char', raw[0] || ' ');
      else if (ty === 'bool') newVal = V('bool', raw !== '0');
      else if (ty === 'double') {
        var dn = Number(raw);
        if (isNaN(dn)) throw CppError('cin ждёт число, а во вводе «' + raw + '»', tgt.line || node.line);
        newVal = V('double', dn);
      } else {
        var inn = Number(raw);
        if (isNaN(inn)) throw CppError('cin ждёт целое число, а во вводе «' + raw + '»', tgt.line || node.line);
        newVal = V('int', Math.trunc(inn));
      }
      cur.set(newVal);
    }
  };

  Interp.prototype.getLValue = function (node, scope) {
    var self = this;
    if (node.type === 'Name') {
      var f = this.findVar(scope, node.id, node.line);
      if (f.slot.isConst) throw CppError('«' + node.id + '» объявлена как const — менять нельзя', node.line);
      return {
        value: f.slot.value,
        set: function (v) { f.slot.value = v; }
      };
    }
    if (node.type === 'Index') {
      var objRef = this.getLValue(node.obj, scope);
      var coll = objRef.value;
      if (!coll || (coll.t !== 'array' && coll.t !== 'vector' && coll.t !== 'string')) {
        throw CppError('индексы можно брать только у массива, vector или string', node.line);
      }
      var iv = Math.trunc(numOf(this.eval(node.index, scope)));
      if (iv < 0 || iv >= coll.v.length) {
        throw CppError('индекс ' + iv + ' вне диапазона: размер ' + typeLabel(coll.t) + ' = ' + coll.v.length, node.line);
      }
      if (coll.t === 'string') {
        return {
          value: V('char', coll.v[iv]),
          set: function (v) {
            var ch = v.t === 'char' ? v.v : String.fromCharCode(numOf(v));
            coll.v = coll.v.slice(0, iv) + ch + coll.v.slice(iv + 1);
          }
        };
      }
      return {
        value: coll.v[iv],
        set: function (v) { coll.v[iv] = v; }
      };
    }
    throw CppError('слева от «=» должно быть имя переменной или элемент массива', node.line);
  };

  /* --- выражения --- */
  Interp.prototype.eval = function (node, scope) {
    this.tick(node.line);
    switch (node.type) {
      case 'Num': return node.isFloat ? V('double', node.value) : V('int', node.value);
      case 'Str': return V('string', node.value);
      case 'Char': return V('char', node.value);
      case 'Bool': return V('bool', node.value);
      case 'Name': return this.readVar(scope, node.id, node.line);
      case 'InitList': throw CppError('список в фигурных скобках можно использовать только при объявлении', node.line);
      case 'Cast': {
        var cv = this.eval(node.value, scope);
        if (node.ty.name === 'string') throw CppError('приведение к string не поддерживается — используй to_string()', node.line);
        return this.coerce(cv, node.ty, node.line);
      }
      case 'Index': return this.getLValue(node, scope).value;
      case 'Ternary': {
        var c = this.eval(node.cond, scope);
        return truthy(c) ? this.eval(node.a, scope) : this.eval(node.b, scope);
      }
      case 'Un': {
        var v = this.eval(node.value, scope);
        if (node.op === '-') {
          if (!isNumType(v.t)) throw CppError('минус перед ' + typeLabel(v.t), node.line);
          return V(v.t === 'double' ? 'double' : 'int', -numOf(v));
        }
        if (node.op === '!') return V('bool', !truthy(v));
        return v;
      }
      case 'IncDec': {
        var lv = this.getLValue(node.value, scope);
        var old = lv.value;
        if (!old || !isNumType(old.t)) throw CppError('++ и -- работают только с числами', node.line);
        var delta = node.op === '++' ? 1 : -1;
        var nextType = old.t === 'double' ? 'double' : (old.t === 'char' ? 'char' : 'int');
        var nextValue = numOf(old) + delta;
        var next = nextType === 'char' ? V('char', String.fromCharCode(nextValue)) : V(nextType, nextValue);
        lv.set(next);
        return node.prefix ? next : old;
      }
      case 'Assign': {
        var target = this.getLValue(node.target, scope);
        var rv = this.eval(node.value, scope);
        var result;
        if (node.op === '=') {
          result = target.value ? this.coerce(rv, { name: target.value.t === 'array' ? 'array' : target.value.t }, node.line) : rv;
          if (target.value && (target.value.t === 'array' || target.value.t === 'vector')) result = cloneColl(rv);
        } else {
          var base = target.value;
          if (!base) throw CppError('нельзя применить «' + node.op + '» к необъявленному значению', node.line);
          var opChar = node.op[0];
          result = this.arith(opChar, base, rv, node.line);
          result = this.coerce(result, { name: base.t }, node.line);
        }
        target.set(result);
        return result;
      }
      case 'Bin': return this.binOp(node, scope);
      case 'Call': return this.callNode(node, scope);
      case 'Member': throw CppError('метод «' + node.name + '» нужно вызвать со скобками', node.line);
      default: throw CppError('внутренняя ошибка: неизвестное выражение ' + node.type, node.line);
    }
  };

  function cloneColl(v) {
    if (v.t === 'array' || v.t === 'vector') return V(v.t, v.v.slice());
    return v;
  }

  function truthy(v) {
    if (v.t === 'bool') return !!v.v;
    if (v.t === 'string') return v.v.length > 0;
    if (v.t === 'array' || v.t === 'vector') return v.v.length > 0;
    if (v.t === 'void') return false;
    if (v.v === null) return false;
    return numOf(v) !== 0;
  }

  function fmtValue(v, line) {
    if (v === null || v === undefined || v.t === 'void') throw CppError('нечего выводить: функция ничего не вернула (void)', line);
    if (v.t === 'string') return v.v;
    if (v.t === 'char') return v.v;
    if (v.t === 'bool') return v.v ? '1' : '0';
    if (v.t === 'double') return fmtDouble(v.v);
    if (v.t === 'int') return String(v.v);
    throw CppError('нельзя вывести ' + typeLabel(v.t) + ' целиком (выведи элементы по одному)', line);
  }

  Interp.prototype.arith = function (op, a, b, line) {
    var aStr = a.t === 'string', bStr = b.t === 'string';
    if (aStr || bStr) {
      if (op === '+') {
        if (aStr && (b.t === 'string' || b.t === 'char')) return V('string', a.v + (b.t === 'char' ? b.v : b.v));
        if (bStr && a.t === 'char') return V('string', a.v + b.v);
        throw CppError('нельзя сложить string и число. Сначала преврати число в строку: to_string(x)', line);
      }
      if (op === '==' || op === '!=' || op === '<' || op === '>' || op === '<=' || op === '>=') {
        var sa = aStr ? a.v : (a.t === 'char' ? a.v : null);
        var sb = bStr ? b.v : (b.t === 'char' ? b.v : null);
        if (sa === null || sb === null) throw CppError('строку можно сравнивать только со строкой или символом', line);
        if (op === '==') return V('bool', sa === sb);
        if (op === '!=') return V('bool', sa !== sb);
        if (op === '<') return V('bool', sa < sb);
        if (op === '>') return V('bool', sa > sb);
        if (op === '<=') return V('bool', sa <= sb);
        return V('bool', sa >= sb);
      }
      throw CppError('для строк поддерживаются только + и сравнения', line);
    }

    if (op === '&&' || op === '||') {
      return V('bool', op === '&&' ? (truthy(a) && truthy(b)) : (truthy(a) || truthy(b)));
    }
    if (!isNumType(a.t) || !isNumType(b.t)) {
      throw CppError('операция «' + op + '» не работает с ' + typeLabel(a.t) + ' и ' + typeLabel(b.t), line);
    }
    var x = numOf(a), y = numOf(b);
    var isDouble = a.t === 'double' || b.t === 'double';

    switch (op) {
      case '+': return isDouble ? V('double', x + y) : V('int', x + y);
      case '-': return isDouble ? V('double', x - y) : V('int', x - y);
      case '*': return isDouble ? V('double', x * y) : V('int', x * y);
      case '/':
        if (y === 0) throw CppError(isDouble ? 'деление на ноль' : 'целочисленное деление на ноль', line);
        return isDouble ? V('double', x / y) : V('int', Math.trunc(x / y));
      case '%':
        if (isDouble) throw CppError('остаток % работает только с целыми числами', line);
        if (y === 0) throw CppError('остаток от деления на ноль', line);
        return V('int', x % y);
      case '==': return V('bool', x === y);
      case '!=': return V('bool', x !== y);
      case '<': return V('bool', x < y);
      case '>': return V('bool', x > y);
      case '<=': return V('bool', x <= y);
      case '>=': return V('bool', x >= y);
      case '<<': return V('int', Math.trunc(x) * Math.pow(2, Math.trunc(y)));
      case '>>': return V('int', Math.floor(Math.trunc(x) / Math.pow(2, Math.trunc(y))));
      default: throw CppError('неизвестная операция «' + op + '»', line);
    }
  };

  Interp.prototype.binOp = function (node, scope) {
    if (node.op === '&&') {
      var l = this.eval(node.l, scope);
      if (!truthy(l)) return V('bool', false);
      return V('bool', truthy(this.eval(node.r, scope)));
    }
    if (node.op === '||') {
      var l2 = this.eval(node.l, scope);
      if (truthy(l2)) return V('bool', true);
      return V('bool', truthy(this.eval(node.r, scope)));
    }
    var a = this.eval(node.l, scope);
    var b = this.eval(node.r, scope);
    return this.arith(node.op, a, b, node.line);
  };

  Interp.prototype.callNode = function (node, scope) {
    var self = this;
    var callee = node.callee;

    if (callee.type === 'Member') {
      var objV = this.eval(callee.obj, scope);
      return this.callMethod(objV, callee.name, node.args.map(function (a) { return self.eval(a, scope); }), node.line);
    }
    if (callee.type !== 'Name') throw CppError('вызвать можно только функцию', node.line);
    var name = callee.id;
    var args = node.args.map(function (a) { return self.eval(a, scope); });

    if (this.funcs[name]) return this.callUser(this.funcs[name], args, node.line);
    var builtin = this.callBuiltin(name, args, node.line, scope);
    if (builtin !== undefined) return builtin;
    throw CppError('функция «' + name + '» не объявлена' + (name === 'printf' || name === 'scanf'
      ? ' — используй cout и cin' : ''), node.line);
  };

  Interp.prototype.callBuiltin = function (name, args, line, scope) {
    function num(i) {
      if (!args[i] || !isNumType(args[i].t)) throw CppError('функция ' + name + ' ждёт число', line);
      return numOf(args[i]);
    }
    switch (name) {
      case 'abs': return V('int', Math.abs(Math.trunc(num(0))));
      case 'fabs': return V('double', Math.abs(num(0)));
      case 'sqrt': return V('double', Math.sqrt(num(0)));
      case 'pow': return V('double', Math.pow(num(0), num(1)));
      case 'floor': return V('double', Math.floor(num(0)));
      case 'ceil': return V('double', Math.ceil(num(0)));
      case 'round': return V('double', Math.round(num(0)));
      case 'min': return args[0].t === 'double' || args[1].t === 'double' ? V('double', Math.min(num(0), num(1))) : V('int', Math.min(num(0), num(1)));
      case 'max': return args[0].t === 'double' || args[1].t === 'double' ? V('double', Math.max(num(0), num(1))) : V('int', Math.max(num(0), num(1)));
      case 'to_string': {
        var v = args[0];
        if (!v) throw CppError('to_string ждёт значение', line);
        if (v.t === 'string') return v;
        return V('string', fmtValue(v, line));
      }
      case 'stoi': {
        var s = args[0];
        if (!s || s.t !== 'string') throw CppError('stoi ждёт строку', line);
        var n = parseInt(s.v, 10);
        return V('int', isNaN(n) ? 0 : n);
      }
      case 'stod': {
        var s2 = args[0];
        if (!s2 || s2.t !== 'string') throw CppError('stod ждёт строку', line);
        var d = Number(s2.v);
        return V('double', isNaN(d) ? 0 : d);
      }
      case 'rand': return V('int', Math.floor(Math.random() * 32768));
      case 'srand': return V('void', null);
      default: return undefined;
    }
  };

  Interp.prototype.callMethod = function (obj, myname, args, line) {
    function noArgs() {
      if (args.length) throw CppError('метод ' + myname + ' не принимает аргументов', line);
    }
    if (obj.t === 'string') {
      if (myname === 'size' || myname === 'length') { noArgs(); return V('int', obj.v.length); }
      if (myname === 'empty') { noArgs(); return V('bool', obj.v.length === 0); }
      if (myname === 'substr') {
        var st = Math.trunc(numOf(args[0] || V('int', 0)));
        var len = args[1] ? Math.trunc(numOf(args[1])) : obj.v.length - st;
        if (st < 0 || st > obj.v.length) throw CppError('substr: начало ' + st + ' вне строки', line);
        return V('string', obj.v.substr(st, Math.max(0, len)));
      }
      if (myname === 'find') {
        var needle = args[0];
        if (!needle) throw CppError('find ждёт строку', line);
        var ns = needle.t === 'char' ? needle.v : needle.v;
        var pos = obj.v.indexOf(ns);
        return V('int', pos < 0 ? -1 : pos);
      }
      if (myname === 'push_back') {
        var ch = args[0];
        if (!ch || (ch.t !== 'char' && ch.t !== 'string')) throw CppError('у string.push_back аргумент — символ', line);
        obj.v += ch.v;
        return V('void', null);
      }
      if (myname === 'append') {
        var s = args[0];
        if (!s || s.t !== 'string') throw CppError('append ждёт строку', line);
        obj.v += s.v;
        return V('void', null);
      }
      if (myname === 'clear') { noArgs(); obj.v = ''; return V('void', null); }
      throw CppError('у string нет метода «' + myname + '». Есть: size(), length(), empty(), substr(), find(), push_back(), append(), clear()', line);
    }
    if (obj.t === 'vector' || obj.t === 'array') {
      if (myname === 'size') { noArgs(); return V('int', obj.v.length); }
      if (myname === 'empty') { noArgs(); return V('bool', obj.v.length === 0); }
      if (myname === 'push_back') {
        if (obj.t !== 'vector') throw CppError('push_back есть только у vector, а это массив фиксированного размера', line);
        obj.v.push(args[0]);
        return V('void', null);
      }
      if (myname === 'pop_back') {
        if (obj.t !== 'vector') throw CppError('pop_back есть только у vector', line);
        if (!obj.v.length) throw CppError('pop_back у пустого vector', line);
        obj.v.pop();
        return V('void', null);
      }
      if (myname === 'clear') { noArgs(); obj.v.length = 0; return V('void', null); }
      if (myname === 'at') {
        var i = Math.trunc(numOf(args[0]));
        if (i < 0 || i >= obj.v.length) throw CppError('at(' + i + ') вне диапазона', line);
        return obj.v[i];
      }
      throw CppError('у ' + typeLabel(obj.t) + ' нет метода «' + myname + '». Есть: size(), push_back(), pop_back(), empty(), at()', line);
    }
    throw CppError('у ' + typeLabel(obj.t) + ' нет методов', line);
  };

  Interp.prototype.callUser = function (fn, args, line) {
    if (fn.params.length !== args.length) {
      throw CppError('функция ' + fn.name + ' ждёт ' + fn.params.length + ' аргумент(ов), а передано ' + args.length, line);
    }
    if (++this.depth > 400) { this.depth = 0; throw CppError('слишком глубокая рекурсия — проверь условие выхода', line); }
    var scope = { vars: Object.create(null), parent: this.globals };
    for (var i = 0; i < fn.params.length; i++) {
      var p = fn.params[i];
      var v = this.coerce(args[i], p.type, line);
      if (v.t === 'array' || v.t === 'vector') v = cloneColl(v);
      scope.vars[p.name] = { value: v, isConst: false };
    }
    var sig = this.exec(fn.body, scope);
    this.depth--;
    var retType = fn.ret ? fn.ret.name : 'void';
    if (retType === 'void') {
      if (sig && sig.sig === 'return') return V('void', null);
      return V('void', null);
    }
    if (!sig || sig.sig !== 'return') {
      if (fn.name === 'main') return V('int', 0);  // в C++ main возвращает 0 по умолчанию
      throw CppError('функция ' + fn.name + ' должна вернуть значение типа ' + retType + ', но дошла до конца без return', fn.line);
    }
    return this.coerce(sig.value, fn.ret, fn.line);
  };

  /* ------------------------------ публичный API ------------------------------ */
  function runProgram(code, input) {
    var out = '';
    try {
      var toks = tokenize(String(code || ''));
      var parser = new Parser(toks);
      var program = parser.parseProgram();
      var interp = new Interp(program);
      out = interp.runProgram(input);
      return { ok: true, output: out, error: null, line: 0 };
    } catch (e) {
      if (e && e.isCpp) return { ok: false, output: '', error: e.message, line: e.line || 0 };
      return { ok: false, output: '', error: 'внутренняя ошибка движка: ' + (e && e.message ? e.message : String(e)), line: 0 };
    }
  }

  G.CppEngine = { run: runProgram, version: '1.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = { run: runProgram };
})(typeof window !== 'undefined' ? window : globalThis);
