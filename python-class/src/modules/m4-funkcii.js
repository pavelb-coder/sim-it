/* ==========================================================================
   Модуль 4 «Функции» — параметры по умолчанию, возврат списков, рекурсия, модули.
   ========================================================================== */
(function (global) {
  'use strict';
  global.PYMODULES = global.PYMODULES || [];
  global.PYMODULES.push({
    id: 'm4',
    title: 'Модуль 4. Функции',
    subtitle: 'параметры по умолчанию, возврат значений, рекурсия, модуль math',
    tasks: [
      {
        id: 'm4t1',
        level: 'легко',
        title: 'Степень с умолчанием',
        subtitle: 'параметр по умолчанию',
        theory: '<p>Параметр может иметь значение по умолчанию: <code>def power(x, p=2):</code>. ' +
                'Если второй аргумент не передали — берётся 2.</p>' +
                '<p>Одна и та же функция вызывается по-разному: <code>power(5)</code> и <code>power(2, 10)</code>.</p>',
        prompt: 'Первая строка — число x, вторая — показатель p. ' +
                'Напиши функцию <code>power(x, p=2)</code> и выведи две строки: <code>power(x)</code> и <code>power(x, p)</code>.',
        examples: [{ inp: '5\n2', out: '25\n25' }, { inp: '2\n10', out: '4\n1024' }],
        starter: 'def power(x, p=2):\n    # верни x в степени p\n    return 0\n\n\nx = int(input())\np = int(input())\nprint(power(x))\nprint(power(x, p))\n',
        tests: [
          { stdin: '5\n2', expected: '25\n25' },
          { stdin: '2\n10', expected: '4\n1024' },
          { stdin: '3\n3', expected: '9\n27' },
          { stdin: '1\n7', expected: '1\n1' }
        ],
        hint: 'В теле функции: return x ** p.',
        solution: 'def power(x, p=2):\n    return x ** p\n\n\nx = int(input())\np = int(input())\nprint(power(x))\nprint(power(x, p))'
      },
      {
        id: 'm4t2',
        level: 'легко',
        title: 'Функция возвращает список',
        subtitle: 'return списка, диапазон аргументов',
        theory: '<p>Функция может возвращать не одно число, а целый список: создаём его внутри, ' +
                'наполняем и возвращаем через <code>return res</code>.</p>' +
                '<p>Вызывающий код получает готовый список и может, например, склеить его в строку.</p>',
        prompt: 'Ввод: два числа a и b (a ≤ b). Напиши функцию <code>evens(a, b)</code>, которая возвращает список ' +
                'чётных чисел от a до b включительно. Выведи результат через пробел.',
        examples: [{ inp: '2 8', out: '2 4 6 8' }],
        starter: 'def evens(a, b):\n    res = []\n    # перебери диапазон\n    return res\n\n\na, b = [int(x) for x in input().split()]\nprint(" ".join(str(x) for x in evens(a, b)))\n',
        tests: [
          { stdin: '2 8', expected: '2 4 6 8' },
          { stdin: '1 5', expected: '2 4' },
          { stdin: '4 4', expected: '4' },
          { stdin: '11 13', expected: '12' }
        ],
        hint: 'for i in range(a, b + 1): if i % 2 == 0: res.append(i)',
        solution: 'def evens(a, b):\n    res = []\n    for i in range(a, b + 1):\n        if i % 2 == 0:\n            res.append(i)\n    return res\n\n\na, b = [int(x) for x in input().split()]\nprint(" ".join(str(x) for x in evens(a, b)))'
      },
      {
        id: 'm4t3',
        level: 'средне',
        title: 'Сумма цифр через рекурсию',
        subtitle: 'рекурсия без циклов',
        theory: '<p>Число можно «разобрать» рекурсивно: последняя цифра — <code>n % 10</code>, остальное — <code>n // 10</code>. ' +
                'Тогда <code>sum_digits(n) = n % 10 + sum_digits(n // 10)</code>, база — когда <code>n == 0</code>.</p>',
        prompt: 'Считай натуральное число. Выведи сумму его цифр, посчитанную рекурсивной функцией <code>sum_digits(n)</code>.',
        examples: [{ inp: '1234', out: '10' }],
        starter: 'def sum_digits(n):\n    # база и шаг\n    return 0\n\n\nn = int(input())\nprint(sum_digits(n))\n',
        tests: [
          { stdin: '1234', expected: '10' },
          { stdin: '9', expected: '9' },
          { stdin: '1000', expected: '1' },
          { stdin: '99999', expected: '45' }
        ],
        hint: 'if n == 0: return 0; иначе return n % 10 + sum_digits(n // 10).',
        solution: 'def sum_digits(n):\n    if n == 0:\n        return 0\n    return n % 10 + sum_digits(n // 10)\n\n\nn = int(input())\nprint(sum_digits(n))'
      },
      {
        id: 'm4t4',
        level: 'средне',
        title: 'Взаимно простые',
        subtitle: 'функция + reuse',
        theory: '<p>Хорошая функция используется несколько раз. Здесь НОД нужен как инструмент: ' +
                'два числа взаимно простые, если их НОД равен 1.</p>' +
                '<p>Функцию лучше писать отдельно от ввода-вывода: она принимает числа и возвращает результат.</p>',
        prompt: 'Ввод: два числа через пробел. Напиши функцию <code>gcd(a, b)</code> и выведи <code>да</code>, ' +
                'если числа взаимно простые (НОД = 1), иначе <code>нет</code>.',
        examples: [{ inp: '9 28', out: 'да' }, { inp: '12 18', out: 'нет' }],
        starter: 'def gcd(a, b):\n    # алгоритм Евклида\n    return 1\n\n\na, b = [int(x) for x in input().split()]\nif gcd(a, b) == 1:\n    print("да")\nelse:\n    print("нет")\n',
        tests: [
          { stdin: '9 28', expected: 'да' },
          { stdin: '12 18', expected: 'нет' },
          { stdin: '7 13', expected: 'да' },
          { stdin: '100 75', expected: 'нет' }
        ],
        hint: 'Внутри gcd: while b != 0: a, b = b, a % b; затем return a.',
        solution: 'def gcd(a, b):\n    while b != 0:\n        a, b = b, a % b\n    return a\n\n\na, b = [int(x) for x in input().split()]\nif gcd(a, b) == 1:\n    print("да")\nelse:\n    print("нет")'
      },
      {
        id: 'm4t5',
        level: 'средне',
        title: 'Палиндромы пачкой',
        subtitle: 'функция в цикле по строкам',
        theory: '<p>Первая строка ввода может говорить, сколько будет строк: <code>n = int(input())</code>, ' +
                'а дальше цикл <code>for i in range(n)</code> читает по одной строке.</p>' +
                '<p>Так проверяют сразу много слов одной функцией — это и есть смысл функций.</p>',
        prompt: 'Первая строка — количество слов N. Далее N строк со словами. Для каждого слова выведи ' +
                '<code>да</code>, если это палиндром, иначе <code>нет</code> — каждое с новой строки. ' +
                'Проверку оформи функцией <code>is_palindrome(s)</code>.',
        examples: [{ inp: '2\nшалаш\nпривет', out: 'да\nнет' }],
        starter: 'def is_palindrome(s):\n    # верни True или False\n    return False\n\n\nn = int(input())\nfor i in range(n):\n    word = input()\n    # выведи ответ\n',
        tests: [
          { stdin: '2\nшалаш\nпривет', expected: 'да\nнет' },
          { stdin: '3\nа\nabba\nabc', expected: 'да\nда\nнет' },
          { stdin: '1\nтопот', expected: 'да' }
        ],
        hint: 'В функции: return s == s[::-1]. В цикле: if is_palindrome(word): print("да") else: print("нет").',
        solution: 'def is_palindrome(s):\n    return s == s[::-1]\n\n\nn = int(input())\nfor i in range(n):\n    word = input()\n    if is_palindrome(word):\n        print("да")\n    else:\n        print("нет")'
      },
      {
        id: 'm4t6',
        level: 'средне',
        title: 'Модуль math',
        subtitle: 'import math, округление форматом',
        theory: '<p>Готовые функции берут из модулей: <code>import math</code> даёт <code>math.sqrt</code> (корень), ' +
                '<code>math.floor</code>, <code>math.pi</code> и другие.</p>' +
                '<p>Формат <code>f"{x:.2f}"</code> печатает число с двумя знаками после запятой — это не округление значения, ' +
                'а формат вывода.</p>',
        prompt: 'Ввод: два катета через пробел. Напиши функцию <code>hypot(a, b)</code> с использованием <code>math.sqrt</code> ' +
                'и выведи гипотенузу с двумя знаками после запятой.',
        examples: [{ inp: '3 4', out: '5.00' }, { inp: '1 1', out: '1.41' }],
        starter: 'import math\n\n\ndef hypot(a, b):\n    # теорема Пифагора\n    return 0\n\n\na, b = [int(x) for x in input().split()]\nprint(f"{hypot(a, b):.2f}")\n',
        tests: [
          { stdin: '3 4', expected: '5.00' },
          { stdin: '1 1', expected: '1.41' },
          { stdin: '6 8', expected: '10.00' },
          { stdin: '5 12', expected: '13.00' }
        ],
        hint: 'return math.sqrt(a * a + b * b) — или math.hypot(a, b).',
        solution: 'import math\n\n\ndef hypot(a, b):\n    return math.sqrt(a * a + b * b)\n\n\na, b = [int(x) for x in input().split()]\nprint(f"{hypot(a, b):.2f}")'
      }
    ]
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = global.PYMODULES;
})(typeof window !== 'undefined' ? window : globalThis);
