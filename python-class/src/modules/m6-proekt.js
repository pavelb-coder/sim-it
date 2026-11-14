/* ==========================================================================
   Модуль 6 «Итоговый проект» — задачи, где нужно собрать всё вместе.
   ========================================================================== */
(function (global) {
  'use strict';
  global.PYMODULES = global.PYMODULES || [];
  global.PYMODULES.push({
    id: 'm6',
    title: 'Модуль 6. Итоговый проект',
    subtitle: 'сжатие, разбор выражений, валидация, Фибоначчи, анаграммы',
    tasks: [
      {
        id: 'm6t1',
        level: 'средне',
        title: 'Сжатие повторов (RLE)',
        subtitle: 'два указателя во while',
        theory: '<p>RLE-сжатие: серия одинаковых символов заменяется символом и количеством: ' +
                '<code>"aaabcc"</code> → <code>"a3b1c2"</code>.</p>' +
                '<p>Нужен счётчик <code>i</code>, который сдвигается сразу на длину найденной серии, — иначе символ посчитается дважды.</p>',
        prompt: 'Считай строку без пробелов. Сожми её по правилу RLE: символ + количество повторов подряд. Выведи результат.',
        examples: [{ inp: 'aaabcc', out: 'a3b1c2' }],
        starter: 's = input()\nres = ""\ni = 0\nwhile i < len(s):\n    # найди длину серии, начиная с i\n    pass\n\nprint(res)\n',
        tests: [
          { stdin: 'aaabcc', expected: 'a3b1c2' },
          { stdin: 'a', expected: 'a1' },
          { stdin: 'aabb', expected: 'a2b2' },
          { stdin: 'abcd', expected: 'a1b1c1d1' },
          { stdin: 'zzzzzzzzzz', expected: 'z10' }
        ],
        hint: 'Внутри: ch = s[i]; k = 1; while i + k < len(s) and s[i + k] == ch: k += 1; res += ch + str(k); i += k.',
        solution: 's = input()\nres = ""\ni = 0\nwhile i < len(s):\n    ch = s[i]\n    k = 1\n    while i + k < len(s) and s[i + k] == ch:\n        k += 1\n    res += ch + str(k)\n    i += k\nprint(res)'
      },
      {
        id: 'm6t2',
        level: 'средне',
        title: 'Калькулятор из строки',
        subtitle: 'разбор текста на части',
        theory: '<p>Выражение <code>"12+5"</code> — это строка. Чтобы её посчитать, нужно найти позицию знака операции, ' +
                'разрезать строку срезами и превратить части в числа.</p>' +
                '<p>Срезы <code>expr[:i]</code> и <code>expr[i+1:]</code> дают левую и правую части без знака.</p>',
        prompt: 'Считай строку вида «число операция число» без пробелов, где операция — одна из <code>+</code>, ' +
                '<code>-</code>, <code>*</code>, а числа положительные. Выведи результат.',
        examples: [{ inp: '12+5', out: '17' }, { inp: '7*6', out: '42' }],
        starter: 'expr = input()\n\n# найди, где заканчивается первое число\ni = 1\nwhile i < len(expr) and expr[i].isdigit():\n    i += 1\n\n# разбери и посчитай\n',
        tests: [
          { stdin: '12+5', expected: '17' },
          { stdin: '7*6', expected: '42' },
          { stdin: '10-3', expected: '7' },
          { stdin: '100+1', expected: '101' },
          { stdin: '9*9', expected: '81' }
        ],
        hint: 'a = int(expr[:i]); op = expr[i]; b = int(expr[i+1:]). Затем три ветки: if/elif/else.',
        solution: 'expr = input()\ni = 1\nwhile i < len(expr) and expr[i].isdigit():\n    i += 1\na = int(expr[:i])\nop = expr[i]\nb = int(expr[i + 1:])\nif op == "+":\n    print(a + b)\nelif op == "-":\n    print(a - b)\nelse:\n    print(a * b)'
      },
      {
        id: 'm6t3',
        level: 'легко',
        title: 'Проверка пароля',
        subtitle: 'флаги и условия',
        theory: '<p>Проверка «на всё сразу» делается флагами: заводим <code>has_digit = False</code>, ' +
                'идём по символам и поднимаем флаг, когда условие выполнено.</p>' +
                '<p>Итог — одна составная проверка через <code>and</code>. Флаги удобнее, чем вложенные условия: ' +
                'видно, какое именно требование не выполнено.</p>',
        prompt: 'Считай пароль. Пароль надёжный, если в нём не меньше 8 символов, есть хотя бы одна цифра ' +
                'и хотя бы одна заглавная буква. Выведи <code>надёжный</code> или <code>слабый</code>.',
        examples: [{ inp: 'Qwerty12', out: 'надёжный' }, { inp: 'qwerty12', out: 'слабый' }],
        starter: 'password = input()\n\nhas_digit = False\nhas_upper = False\n# перебери символы\n\nif len(password) >= 8 and has_digit and has_upper:\n    print("надёжный")\nelse:\n    print("слабый")\n',
        tests: [
          { stdin: 'Qwerty12', expected: 'надёжный' },
          { stdin: 'qwerty12', expected: 'слабый' },
          { stdin: 'Qwerty', expected: 'слабый' },
          { stdin: 'Qwerty123', expected: 'надёжный' },
          { stdin: '12345678', expected: 'слабый' }
        ],
        hint: 'В цикле по символам: if ch.isdigit(): has_digit = True; if ch.isupper(): has_upper = True.',
        solution: 'password = input()\nhas_digit = False\nhas_upper = False\nfor ch in password:\n    if ch.isdigit():\n        has_digit = True\n    if ch.isupper():\n        has_upper = True\nif len(password) >= 8 and has_digit and has_upper:\n    print("надёжный")\nelse:\n    print("слабый")'
      },
      {
        id: 'm6t4',
        level: 'средне',
        title: 'Числа Фибоначчи до N',
        subtitle: 'while и обмен значений',
        theory: '<p>Последовательность Фибоначчи: каждое следующее число — сумма двух предыдущих. ' +
                'Держим два числа <code>a</code> и <code>b</code> и обновляем их: <code>a, b = b, a + b</code>.</p>' +
                '<p><code>while a &lt;= n</code> — цикл идёт, пока число не вышло за границу.</p>',
        prompt: 'Считай N. Выведи через пробел все числа Фибоначчи, начиная с двух единиц, которые не больше N.',
        examples: [{ inp: '10', out: '1 1 2 3 5 8' }],
        starter: 'n = int(input())\na = 1\nb = 1\nres = []\n\nwhile a <= n:\n    # добавь a и сдвинь пару\n    pass\n\nprint(" ".join(res))\n',
        tests: [
          { stdin: '10', expected: '1 1 2 3 5 8' },
          { stdin: '1', expected: '1 1' },
          { stdin: '20', expected: '1 1 2 3 5 8 13' },
          { stdin: '2', expected: '1 1 2' }
        ],
        hint: 'Внутри цикла: res.append(str(a)); a, b = b, a + b.',
        solution: 'n = int(input())\na = 1\nb = 1\nres = []\nwhile a <= n:\n    res.append(str(a))\n    a, b = b, a + b\nprint(" ".join(res))'
      },
      {
        id: 'm6t5',
        level: 'легко',
        title: 'Анаграммы',
        subtitle: 'сортировка букв как подпись слова',
        theory: '<p>Два слова — анаграммы, если состоят из одинаковых букв в разном порядке. ' +
                'Если отсортировать буквы, у анаграмм получится одинаковая строка: <code>"кот"</code> и <code>"ток"</code> → <code>"кот"</code>.</p>' +
                '<p><code>sorted("кот")</code> возвращает список букв — сравнить можно и списки.</p>',
        prompt: 'Ввод: два слова, каждое на своей строке. Выведи <code>да</code>, если это анаграммы, иначе <code>нет</code>.',
        examples: [{ inp: 'кот\nток', out: 'да' }, { inp: 'кот\nпёс', out: 'нет' }],
        starter: 'first = input()\nsecond = input()\n\n# сравни отсортированные буквы\n',
        tests: [
          { stdin: 'кот\nток', expected: 'да' },
          { stdin: 'кот\nкто', expected: 'да' },
          { stdin: 'кот\nпёс', expected: 'нет' },
          { stdin: 'аб\nа', expected: 'нет' }
        ],
        hint: 'if sorted(first) == sorted(second): print("да") — иначе print("нет").',
        solution: 'first = input()\nsecond = input()\nif sorted(first) == sorted(second):\n    print("да")\nelse:\n    print("нет")'
      }
    ]
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = global.PYMODULES;
})(typeof window !== 'undefined' ? window : globalThis);
