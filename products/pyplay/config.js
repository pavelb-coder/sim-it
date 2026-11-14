/* Python-песочница: примеры, шпаргалка и подключение движка PyTrainer. */
(function (global) {
  'use strict';

  var CHEAT = [
    'print("текст")           вывод строки',
    'print(a, b)              несколько значений через пробел',
    'x = int(input())         прочитать число',
    's = input()              прочитать строку',
    '',
    'if x > 0:                условие',
    '    print("плюс")',
    'elif x == 0:',
    '    print("ноль")',
    'else:',
    '    print("минус")',
    '',
    'for i in range(5):       цикл по счётчику (0…4)',
    '    print(i)',
    'while n > 0:             цикл с условием',
    '    n = n // 10',
    '',
    'a = [3, 1, 2]            список',
    'a.append(9); a[0]; a[-1]; a[1:3]',
    'd = {"имя": "Аня"}       словарь: d["имя"], d.get("x", 0)',
    's.split(); s.join("-"); s.strip(); s.upper(); s.lower()',
    'len(a); sum(a); max(a); min(a); sorted(a); sorted(a, reverse=True)',
    '',
    'def gcd(a, b):            своя функция',
    '    if b == 0:',
    '        return a',
    '    return gcd(b, a % b)',
    '',
    'f"итог: {x}"             f-строка',
    'sum(x * x for x in a)    включение (генератор)',
    'import math              math.sqrt, math.pi'
  ].join('\n');

  var NOTE = '<p style="margin:0 0 8px">Код не уходит в сеть: его разбирает и выполняет учебный ' +
    'интерпретатор Python 3, написанный на JavaScript. Ничего устанавливать не нужно.</p>' +
    '<p style="margin:0 0 8px">Что есть: переменные, <code>int/float/str/bool</code>, списки, словари, ' +
    'множества, срезы, f-строки, условия, циклы, <code>def</code>, рекурсия, включения, ' +
    '<code>sorted/sum/min/max/len</code>, <code>import math</code>, <code>input/print</code>.</p>' +
    '<p style="margin:0">Чего нет: <code>lambda</code>, классов, аннотаций типов, <code>%-</code>формата, ' +
    'файлов и сторонних модулей — площадка честно скажет об этом в ошибке.</p>';

  function adapt(res) {
    if (res && res.ok) return { ok: true, output: res.output, error: null };
    var e = (res && res.error) || {};
    return {
      ok: false,
      output: res && res.output,
      error: { msg: e.msg || 'не удалось выполнить код', line: e.line || null, kind: e.kind || 'Ошибка' }
    };
  }

  global.PLAY_CONFIG = {
    storageKey: 'play.python.v1',
    stdinLabel: 'input()',
    engineLabel: 'движок: Python в браузере · офлайн',
    cheat: CHEAT,
    note: NOTE,
    defaultCode: [
      '# Свободный код на Python.',
      '# Пиши что угодно, ввод — на панели справа, запуск — Ctrl+Enter.',
      '',
      'name = input()',
      'n = int(input())',
      '',
      'print(f"Привет, {name}!")',
      'print("квадрат числа:", n * n)',
      '',
      'for i in range(1, n + 1):',
      '    print(i, "в квадрате —", i * i)'
    ].join('\n'),
    defaultStdin: 'Аня\n5',

    run: function (code, stdinText) {
      var lines = String(stdinText || '').split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      var t0 = Date.now();
      var res = adapt(global.PyTrainer.run(code, { stdin: lines }));
      res.ms = Date.now() - t0;
      return res;
    },

    examples: [
      {
        name: 'Привет, мир',
        code: 'print("Привет, квантум!")\nprint("Python работает прямо в браузере")',
        stdin: ''
      },
      {
        name: 'Ввод и арифметика',
        code: [
          'a = int(input())',
          'b = int(input())',
          '',
          'print("сумма:", a + b)',
          'print("разность:", a - b)',
          'print("произведение:", a * b)',
          'print("деление:", a / b)',
          'print("остаток:", a % b)'
        ].join('\n'),
        stdin: '17\n5'
      },
      {
        name: 'Циклы и таблица умножения',
        code: [
          'n = int(input())',
          '',
          'for i in range(1, n + 1):',
          '    row = ""',
          '    for j in range(1, n + 1):',
          '        row = row + str(i * j) + " "',
          '    print(row)'
        ].join('\n'),
        stdin: '5'
      },
      {
        name: 'Списки и срезы',
        code: [
          'data = input().split()',
          'nums = [int(x) for x in data]',
          '',
          'print("всего:", len(nums))',
          'print("сумма:", sum(nums))',
          'print("минимум и максимум:", min(nums), max(nums))',
          'print("первые три:", nums[:3])',
          'print("по убыванию:", sorted(nums, reverse=True))'
        ].join('\n'),
        stdin: '7 3 9 1 4 8'
      },
      {
        name: 'Словарь: подсчёт слов',
        code: [
          'words = input().split()',
          'counts = {}',
          '',
          'for w in words:',
          '    key = w.lower()',
          '    counts[key] = counts.get(key, 0) + 1',
          '',
          'for pair in sorted(counts.items()):',
          '    print(pair[0], "-", pair[1])'
        ].join('\n'),
        stdin: 'кот пёс кот сова кот пёс'
      },
      {
        name: 'Функция и рекурсия',
        code: [
          'def fact(n):',
          '    if n <= 1:',
          '        return 1',
          '    return n * fact(n - 1)',
          '',
          'def fib(n):',
          '    if n <= 2:',
          '        return 1',
          '    return fib(n - 1) + fib(n - 2)',
          '',
          'n = int(input())',
          'print("факториал:", fact(n))',
          'print("фибоначчи:", fib(n))'
        ].join('\n'),
        stdin: '10'
      },
      {
        name: 'Строки: палиндром',
        code: [
          's = input().strip().lower()',
          'clean = ""',
          '',
          'for ch in s:',
          '    if ch != " ":',
          '        clean = clean + ch',
          '',
          'if clean == clean[::-1]:',
          '    print("это палиндром")',
          'else:',
          '    print("не палиндром")'
        ].join('\n'),
        stdin: 'А роза упала на лапу Азора'
      },
      {
        name: 'Математика: простые числа',
        code: [
          'import math',
          '',
          'def is_prime(n):',
          '    if n < 2:',
          '        return False',
          '    d = 2',
          '    while d * d <= n:',
          '        if n % d == 0:',
          '            return False',
          '        d = d + 1',
          '    return True',
          '',
          'limit = int(input())',
          'primes = [x for x in range(2, limit + 1) if is_prime(x)]',
          'print(f"простые до {limit}: {primes}")',
          'print(f"корень из {limit} = {round(math.sqrt(limit), 3)}")'
        ].join('\n'),
        stdin: '30'
      }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
