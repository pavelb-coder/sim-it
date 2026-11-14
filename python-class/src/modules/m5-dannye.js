/* ==========================================================================
   Модуль 5 «Данные» — таблицы, статистика, проценты, гистограммы, CSV.
   ========================================================================== */
(function (global) {
  'use strict';
  global.PYMODULES = global.PYMODULES || [];
  global.PYMODULES.push({
    id: 'm5',
    title: 'Модуль 5. Данные',
    subtitle: 'статистика, таблицы, доли и проценты, гистограмма, разбор CSV',
    tasks: [
      {
        id: 'm5t1',
        level: 'легко',
        title: 'Статистика ряда',
        subtitle: 'N чисел: минимум, максимум, среднее',
        theory: '<p>Классический разбор данных: прочитать N, затем N чисел, затем посчитать <code>min</code>, ' +
                '<code>max</code> и среднее <code>sum / len</code>.</p>' +
                '<p>Среднее почти всегда дробное — выводи форматом <code>f"{avg:.1f}"</code>.</p>',
        prompt: 'Первая строка — количество чисел N. Вторая — N чисел через пробел. ' +
                'Выведи три строки: минимум, максимум и среднее с одним знаком после запятой.',
        examples: [{ inp: '4\n4 8 15 16', out: '4\n16\n10.8' }],
        starter: 'n = int(input())\nnums = [int(x) for x in input().split()]\n\n# три строки\n',
        tests: [
          { stdin: '4\n4 8 15 16', expected: '4\n16\n10.8' },
          { stdin: '3\n5 5 5', expected: '5\n5\n5.0' },
          { stdin: '2\n-3 7', expected: '-3\n7\n2.0' },
          { stdin: '5\n1 2 3 4 5', expected: '1\n5\n3.0' }
        ],
        hint: 'avg = sum(nums) / len(nums). Каждое значение — отдельным print().',
        solution: 'n = int(input())\nnums = [int(x) for x in input().split()]\navg = sum(nums) / len(nums)\nprint(min(nums))\nprint(max(nums))\nprint(f"{avg:.1f}")'
      },
      {
        id: 'm5t2',
        level: 'средне',
        title: 'Средний балл по ученикам',
        subtitle: 'таблица из строк, split по пробелам',
        theory: '<p>Строка таблицы — это тоже данные: <code>parts = line.split()</code> даёт <code>["Аня", "4", "5", "5"]</code>. ' +
                'Первое поле — текст, остальные нужно превратить в числа.</p>' +
                '<p>Так обычный текст становится таблицей без всяких библиотек.</p>',
        prompt: 'Первая строка — количество учеников N. Далее N строк вида «Имя б1 б2 б3». ' +
                'Для каждого ученика выведи строку <code>Имя среднее</code> с одним знаком после запятой, в порядке ввода.',
        examples: [{ inp: '2\nАня 4 5 5\nБоря 3 3 4', out: 'Аня 4.7\nБоря 3.3' }],
        starter: 'n = int(input())\nfor i in range(n):\n    parts = input().split()\n    name = parts[0]\n    # посчитай среднее по остальным полям\n',
        tests: [
          { stdin: '2\nАня 4 5 5\nБоря 3 3 4', expected: 'Аня 4.7\nБоря 3.3' },
          { stdin: '1\nВера 5 5 5', expected: 'Вера 5.0' },
          { stdin: '2\nГоша 2 3\nДаша 4', expected: 'Гоша 2.5\nДаша 4.0' }
        ],
        hint: 'marks = [int(x) for x in parts[1:]]; avg = sum(marks) / len(marks); print(name, f"{avg:.1f}").',
        solution: 'n = int(input())\nfor i in range(n):\n    parts = input().split()\n    name = parts[0]\n    marks = [int(x) for x in parts[1:]]\n    avg = sum(marks) / len(marks)\n    print(name, f"{avg:.1f}")'
      },
      {
        id: 'm5t3',
        level: 'средне',
        title: 'Подсчёт по категориям',
        subtitle: 'словарь-счётчик и сортировка вывода',
        theory: '<p>Группировка — базовый шаг анализа данных: одна переменная хранит категорию, словарь накапливает счётчики ' +
                '<code>counts[cat] = counts.get(cat, 0) + 1</code>.</p>' +
                '<p>Вывод в отсортированном порядке делает результат предсказуемым: <code>for cat in sorted(counts)</code>.</p>',
        prompt: 'Первая строка — количество записей N. Далее N строк вида «товар категория». ' +
                'Выведи по строке <code>категория: количество</code> в алфавитном порядке категорий.',
        examples: [{ inp: '3\nхлеб еда\nстол мебель\nсыр еда', out: 'еда: 2\nмебель: 1' }],
        starter: 'n = int(input())\ncounts = {}\nfor i in range(n):\n    parts = input().split()\n    cat = parts[1]\n    # увеличить счётчик\n\n# вывести по алфавиту\n',
        tests: [
          { stdin: '3\nхлеб еда\nстол мебель\nсыр еда', expected: 'еда: 2\nмебель: 1' },
          { stdin: '4\na x\nb y\nc x\nd y', expected: 'x: 2\ny: 2' },
          { stdin: '1\nчай напиток', expected: 'напиток: 1' }
        ],
        hint: 'После подсчёта: for cat in sorted(counts): print(f"{cat}: {counts[cat]}").',
        solution: 'n = int(input())\ncounts = {}\nfor i in range(n):\n    parts = input().split()\n    cat = parts[1]\n    counts[cat] = counts.get(cat, 0) + 1\nfor cat in sorted(counts):\n    print(f"{cat}: {counts[cat]}")'
      },
      {
        id: 'm5t4',
        level: 'средне',
        title: 'Доли в процентах',
        subtitle: 'нормировка, формат .1f',
        theory: '<p>Доля элемента: <code>value / total</code>. В процентах — умножить на 100.</p>' +
                '<p>Чтобы сумма процентов не «плясала», считаем <code>total</code> один раз до цикла, а не внутри.</p>',
        prompt: 'Ввод: числа через пробел (все положительные). Выведи долю каждого числа в процентах ' +
                'с одним знаком после запятой, через пробел.',
        examples: [{ inp: '1 1 2', out: '25.0 25.0 50.0' }],
        starter: 'nums = [int(x) for x in input().split()]\ntotal = sum(nums)\nres = []\n\n# посчитай проценты\n\nprint(" ".join(res))\n',
        tests: [
          { stdin: '1 1 2', expected: '25.0 25.0 50.0' },
          { stdin: '5 5', expected: '50.0 50.0' },
          { stdin: '1 3', expected: '25.0 75.0' },
          { stdin: '10 20 30 40', expected: '10.0 20.0 30.0 40.0' }
        ],
        hint: 'Для каждого числа: percent = v / total * 100, затем f"{percent:.1f}".',
        solution: 'nums = [int(x) for x in input().split()]\ntotal = sum(nums)\nres = []\nfor v in nums:\n    percent = v / total * 100\n    res.append(f"{percent:.1f}")\nprint(" ".join(res))'
      },
      {
        id: 'm5t5',
        level: 'средне',
        title: 'Текстовая гистограмма',
        subtitle: 'визуализация данных в консоли',
        theory: '<p>Гистограмма — способ увидеть данные глазами: длина строки из символов показывает величину. ' +
                '<code>"#" * 3</code> даёт <code>"###"</code>.</p>' +
                '<p>Такой приём часто используют в отчётах и логах, где нет графиков.</p>',
        prompt: 'Ввод во второй строке — числа через пробел (каждое от 0 до 20). Для каждого числа выведи строку из символов ' +
                '<code>#</code> длиной, равной числу. Если число 0 — выведи пустую строку.',
        examples: [{ inp: '5\n3 1 0 5', out: '###\n#\n\n#####' }],
        starter: 'n = int(input())\nnums = [int(x) for x in input().split()]\n\nfor v in nums:\n    # строка из решёток\n    pass\n',
        tests: [
          { stdin: '5\n3 1 0 5', expected: '###\n#\n\n#####' },
          { stdin: '3\n2 2 2', expected: '##\n##\n##' },
          { stdin: '2\n20 0', expected: '####################\n' }
        ],
        hint: 'print("#" * v) — печатает и пустую строку, если v равно 0.',
        solution: 'n = int(input())\nnums = [int(x) for x in input().split()]\nfor v in nums:\n    print("#" * v)'
      },
      {
        id: 'm5t6',
        level: 'сложно',
        title: 'Разбор CSV и итоги по городам',
        subtitle: 'split по запятой, агрегация, сортировка',
        theory: '<p>CSV — это просто строки с разделителем: <code>line.split(",")</code>. Пробелов вокруг запятых тут нет, ' +
                'поэтому <code>split()</code> не подойдёт — он режет по пробелам.</p>' +
                '<p>Агрегация: для каждого города копим сумму в словаре: ' +
                '<code>totals[city] = totals.get(city, 0) + amount</code>.</p>',
        prompt: 'Первая строка — количество строк N. Далее N строк вида <code>имя,город,сумма</code>. ' +
                'Выведи для каждого города строку <code>город: сумма</code> в алфавитном порядке городов.',
        examples: [{ inp: '2\nАня,Москва,100\nБоря,Омск,50', out: 'Москва: 100\nОмск: 50' }],
        starter: 'n = int(input())\ntotals = {}\nfor i in range(n):\n    line = input()\n    parts = line.split(",")\n    # город и сумма\n\nfor city in sorted(totals):\n    print(f"{city}: {totals[city]}")\n',
        tests: [
          { stdin: '2\nАня,Москва,100\nБоря,Омск,50', expected: 'Москва: 100\nОмск: 50' },
          { stdin: '3\nАня,Москва,100\nБоря,Москва,250\nВера,Омск,10', expected: 'Москва: 350\nОмск: 10' },
          { stdin: '1\nГоша,Томск,0', expected: 'Томск: 0' },
          { stdin: '4\na,Казань,1\nb,Казань,2\nc,Пермь,3\nd,Пермь,4', expected: 'Казань: 3\nПермь: 7' }
        ],
        hint: 'city = parts[1]; amount = int(parts[2]); totals[city] = totals.get(city, 0) + amount.',
        solution: 'n = int(input())\ntotals = {}\nfor i in range(n):\n    line = input()\n    parts = line.split(",")\n    city = parts[1]\n    amount = int(parts[2])\n    totals[city] = totals.get(city, 0) + amount\nfor city in sorted(totals):\n    print(f"{city}: {totals[city]}")'
      }
    ]
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = global.PYMODULES;
})(typeof window !== 'undefined' ? window : globalThis);
