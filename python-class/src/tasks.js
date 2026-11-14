/* ==========================================================================
   Задачи модуля 1 «Основы Python» для IT-квантума.
   Формат: stdin → stdout. У каждой задачи — скрытые тесты и эталонное решение.
   ========================================================================== */
(function (global) {
  'use strict';

  var TASKS = [
    {
      id: 't1',
      title: 'Число и его степени',
      subtitle: 'ввод, int(), арифметика',
      theory: '<p><code>input()</code> читает строку. Чтобы работать с числом, оберни: <code>n = int(input())</code>.</p>' +
              '<p>Степень в Python — двойная звёздочка: <code>n ** 2</code>, <code>n ** 3</code>.</p>' +
              '<p><code>print()</code> выводит каждое значение с новой строки, если вызвать его отдельно.</p>',
      prompt: 'Считай одно целое число. Выведи на отдельных строках его квадрат и его куб.',
      examples: [{ inp: '3', out: '9\n27' }],
      starter: '# считай число\nn = int(input())\n\n# выведи квадрат и куб\n',
      tests: [
        { stdin: '3', expected: '9\n27' },
        { stdin: '10', expected: '100\n1000' },
        { stdin: '1', expected: '1\n1' },
        { stdin: '0', expected: '0\n0' }
      ],
      hint: 'Квадрат — это n ** 2. Куб — n ** 3. Каждое значение выводи своим print().',
      solution: 'n = int(input())\nprint(n ** 2)\nprint(n ** 3)'
    },
    {
      id: 't2',
      title: 'Сумма двух чисел',
      subtitle: 'несколько input(), порядок строк',
      theory: '<p>Каждый вызов <code>input()</code> забирает <b>одну строку</b> ввода. Первый вызов — первая строка, второй — вторая.</p>' +
              '<p>Результат нужно именно вычислить, а не вывести заранее: тесты подставляют разные числа.</p>',
      prompt: 'Ввод: два целых числа, каждое на своей строке. Выведи их сумму.',
      examples: [{ inp: '2\n3', out: '5' }],
      starter: 'a = int(input())\nb = int(input())\n\n# выведи сумму\n',
      tests: [
        { stdin: '2\n3', expected: '5' },
        { stdin: '-4\n10', expected: '6' },
        { stdin: '0\n0', expected: '0' },
        { stdin: '1000000\n2000000', expected: '3000000' }
      ],
      hint: 'Сумма двух переменных — это a + b внутри print().',
      solution: 'a = int(input())\nb = int(input())\nprint(a + b)'
    },
    {
      id: 't3',
      title: 'Чётное или нечётное',
      subtitle: 'if / else, остаток %',
      theory: '<p>Остаток от деления — <code>%</code>. Если <code>n % 2 == 0</code>, число чётное.</p>' +
              '<p>После условия обязательно двоеточие, а тело — с отступом в 4 пробела.</p>',
      prompt: 'Считай целое число. Выведи ровно одно слово: <code>чётное</code> или <code>нечётное</code>.',
      examples: [{ inp: '4', out: 'чётное' }, { inp: '7', out: 'нечётное' }],
      starter: 'n = int(input())\n\nif n % 2 == 0:\n    print("чётное")\nelse:\n    print("нечётное")\n',
      tests: [
        { stdin: '4', expected: 'чётное' },
        { stdin: '7', expected: 'нечётное' },
        { stdin: '0', expected: 'чётное' },
        { stdin: '-3', expected: 'нечётное' }
      ],
      hint: 'В Python остаток от деления отрицательного числа тоже не равен нулю, так что -3 % 2 == 1 — условие сработает верно.',
      solution: 'n = int(input())\nif n % 2 == 0:\n    print("чётное")\nelse:\n    print("нечётное")'
    },
    {
      id: 't4',
      title: 'Оценка по баллам',
      subtitle: 'elif, вложенные условия',
      theory: '<p>Цепочка <code>if / elif / else</code> проверяет условия сверху вниз и выполняет только первую подходящую ветку.</p>' +
              '<p>Порядок важен: если сначала проверить <code>&gt;= 40</code>, то 90 баллов тоже туда попадёт.</p>',
      prompt: 'Считай баллы (0–100). Выведи оценку: <code>80</code> и больше → <code>5</code>; <code>60</code> и больше → <code>4</code>; ' +
              '<code>40</code> и больше → <code>3</code>; меньше <code>40</code> → <code>2</code>.',
      examples: [{ inp: '85', out: '5' }, { inp: '61', out: '4' }, { inp: '10', out: '2' }],
      starter: 'ball = int(input())\n\nif ball >= 80:\n    print(5)\nelif ball >= 60:\n    print(4)\n# продолжи цепочку\n',
      tests: [
        { stdin: '100', expected: '5' },
        { stdin: '80', expected: '5' },
        { stdin: '79', expected: '4' },
        { stdin: '60', expected: '4' },
        { stdin: '40', expected: '3' },
        { stdin: '39', expected: '2' },
        { stdin: '0', expected: '2' }
      ],
      hint: 'Добавь elif ball >= 40: и последний else: для двойки.',
      solution: 'ball = int(input())\nif ball >= 80:\n    print(5)\nelif ball >= 60:\n    print(4)\nelif ball >= 40:\n    print(3)\nelse:\n    print(2)'
    },
    {
      id: 't5',
      title: 'Сумма от 1 до N',
      subtitle: 'for, range, накопитель',
      theory: '<p><code>range(1, n + 1)</code> даёт числа от 1 до n включительно: правая граница не входит.</p>' +
              '<p>Накопитель заводится до цикла: <code>total = 0</code>, и увеличивается внутри: <code>total += i</code>.</p>',
      prompt: 'Считай N (натуральное число). Выведи сумму всех чисел от 1 до N включительно.',
      examples: [{ inp: '5', out: '15' }],
      starter: 'n = int(input())\ntotal = 0\n\n# цикл от 1 до n\n\nprint(total)\n',
      tests: [
        { stdin: '5', expected: '15' },
        { stdin: '1', expected: '1' },
        { stdin: '100', expected: '5050' },
        { stdin: '1000', expected: '500500' }
      ],
      hint: 'for i in range(1, n + 1):  и внутри total += i.',
      solution: 'n = int(input())\ntotal = 0\nfor i in range(1, n + 1):\n    total += i\nprint(total)'
    },
    {
      id: 't6',
      title: 'Сумма цифр числа',
      subtitle: 'while, // и %',
      theory: '<p>Цифры числа достаются справа налево: последняя цифра — <code>n % 10</code>, остальное — <code>n // 10</code>.</p>' +
              '<p><code>while n &gt; 0:</code> повторяет, пока в числе остались цифры.</p>',
      prompt: 'Считай натуральное число. Выведи сумму его цифр.',
      examples: [{ inp: '123', out: '6' }],
      starter: 'n = int(input())\ntotal = 0\n\nwhile n > 0:\n    # добавь последнюю цифру и отбрось её\n\nprint(total)\n',
      tests: [
        { stdin: '123', expected: '6' },
        { stdin: '9', expected: '9' },
        { stdin: '1000', expected: '1' },
        { stdin: '987654321', expected: '45' }
      ],
      hint: 'Внутри цикла: total += n % 10, затем n = n // 10. Порядок важен — сначала забери цифру.',
      solution: 'n = int(input())\ntotal = 0\nwhile n > 0:\n    total += n % 10\n    n = n // 10\nprint(total)'
    },
    {
      id: 't7',
      title: 'Палиндром',
      subtitle: 'строки, срезы, ==',
      theory: '<p>Срез <code>s[::-1]</code> переворачивает строку: шаг −1 идёт с конца.</p>' +
              '<p>Строки сравниваются через <code>==</code> — посимвольно, с учётом регистра.</p>',
      prompt: 'Считай слово (одна строка). Выведи <code>да</code>, если оно читается одинаково в обе стороны, иначе <code>нет</code>.',
      examples: [{ inp: 'шалаш', out: 'да' }, { inp: 'привет', out: 'нет' }],
      starter: 'word = input()\n\n# переверни строку и сравни\n',
      tests: [
        { stdin: 'шалаш', expected: 'да' },
        { stdin: 'привет', expected: 'нет' },
        { stdin: 'а', expected: 'да' },
        { stdin: 'abba', expected: 'да' },
        { stdin: 'Abc', expected: 'нет' }
      ],
      hint: 'if word == word[::-1]: print("да") else: print("нет").',
      solution: 'word = input()\nif word == word[::-1]:\n    print("да")\nelse:\n    print("нет")'
    },
    {
      id: 't8',
      title: 'Средний балл',
      subtitle: 'split(), списки, float, f-строка',
      theory: '<p><code>input()</code> вернёт всю строку целиком. <code>s.split()</code> разрежет её по пробелам в список строк.</p>' +
              '<p>Превратить весь список в числа: <code>[int(x) for x in s.split()]</code> — это генератор списка.</p>' +
              '<p>Один знак после запятой: <code>f"{value:.1f}"</code>. Деление <code>/</code> всегда даёт float.</p>',
      prompt: 'Первая строка — количество чисел N. Вторая строка — N оценок через пробел. ' +
              'Выведи среднее арифметическое с одним знаком после запятой.',
      examples: [{ inp: '3\n4 5 6', out: '5.0' }],
      starter: 'n = int(input())\nmarks = [int(x) for x in input().split()]\n\n# посчитай среднее\n',
      tests: [
        { stdin: '3\n4 5 6', expected: '5.0' },
        { stdin: '4\n3 3 4 4', expected: '3.5' },
        { stdin: '1\n5', expected: '5.0' },
        { stdin: '5\n2 2 2 2 3', expected: '2.2' }
      ],
      hint: 'Среднее — sum(marks) / len(marks). Вывести: print(f"{avg:.1f}").',
      solution: 'n = int(input())\nmarks = [int(x) for x in input().split()]\navg = sum(marks) / len(marks)\nprint(f"{avg:.1f}")'
    },
    {
      id: 't9',
      title: 'Простое число',
      subtitle: 'def, return, break',
      theory: '<p>Функция объявляется через <code>def имя(параметры):</code> и возвращает значение через <code>return</code>.</p>' +
              '<p>Число простое, если делится только на 1 и на себя. Достаточно проверить делители до корня — но для школьных чисел хватит и полного перебора.</p>',
      prompt: 'Считай целое число (больше 1). Выведи <code>простое</code> или <code>составное</code>. ' +
              'Обязательное условие: проверка должна быть внутри функции <code>is_prime(n)</code>, которая возвращает True или False.',
      examples: [{ inp: '7', out: 'простое' }, { inp: '9', out: 'составное' }],
      starter: 'def is_prime(n):\n    # верни True, если n простое\n    return True\n\n\nn = int(input())\nif is_prime(n):\n    print("простое")\nelse:\n    print("составное")\n',
      tests: [
        { stdin: '7', expected: 'простое' },
        { stdin: '9', expected: 'составное' },
        { stdin: '2', expected: 'простое' },
        { stdin: '97', expected: 'простое' },
        { stdin: '100', expected: 'составное' }
      ],
      hint: 'Перебери d от 2 до n - 1: если n % d == 0 — сразу return False. Если цикл закончился, return True.',
      solution: 'def is_prime(n):\n    d = 2\n    while d < n:\n        if n % d == 0:\n            return False\n        d += 1\n    return True\n\n\nn = int(input())\nif is_prime(n):\n    print("простое")\nelse:\n    print("составное")'
    },
    {
      id: 't10',
      title: 'Частота слов',
      subtitle: 'словари, get(), sorted()',
      theory: '<p>Словарь хранит пары «ключ → значение»: <code>counts[word] = counts.get(word, 0) + 1</code> — так считают частоты без проверки на существование.</p>' +
              '<p><code>sorted(counts)</code> сортирует ключи по алфавиту. Порядок вывода должен быть предсказуемым — сортировка как раз для этого.</p>',
      prompt: 'Считай строку из слов, разделённых пробелами. Для каждого уникального слова выведи строку <code>слово: количество</code>. ' +
              'Слова выводи в алфавитном порядке.',
      examples: [{ inp: 'кот пёс кот', out: 'кот: 2\nпёс: 1' }],
      starter: 'words = input().split()\ncounts = {}\n\n# посчитай частоты\n\n# выведи в алфавитном порядке\n',
      tests: [
        { stdin: 'кот пёс кот', expected: 'кот: 2\nпёс: 1' },
        { stdin: 'a b c', expected: 'a: 1\nb: 1\nc: 1' },
        { stdin: 'раз раз раз', expected: 'раз: 3' },
        { stdin: 'я мы ты мы я я', expected: 'мы: 2\nты: 1\nя: 3' }
      ],
      hint: 'После подсчёта: for word in sorted(counts): print(f"{word}: {counts[word]}").',
      solution: 'words = input().split()\ncounts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\nfor w in sorted(counts):\n    print(f"{w}: {counts[w]}")'
    }
  ];

  global.PYTASKS = TASKS;
  if (typeof module !== 'undefined' && module.exports) module.exports = TASKS;
})(typeof window !== 'undefined' ? window : globalThis);
