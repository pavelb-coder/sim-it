/* ==========================================================================
   Модуль 2 «Алгоритмы» — перебор, поиск, сортировка, рекурсия, Евклид.
   ========================================================================== */
(function (global) {
  'use strict';
  global.PYMODULES = global.PYMODULES || [];
  global.PYMODULES.push({
    id: 'm2',
    title: 'Модуль 2. Алгоритмы',
    subtitle: 'перебор, максимум, пузырёк, бинарный поиск, рекурсия, НОД',
    tasks: [
      {
        id: 'm2t1',
        level: 'легко',
        title: 'Чётные числа',
        subtitle: 'перебор + накопление в список',
        theory: '<p>Чтобы вывести числа через пробел, собери их в список и склей строкой-разделителем: ' +
                '<code>" ".join(строки)</code>. Важно: <code>join</code> работает только со строками, ' +
                'поэтому числа сначала превращаются в строки через <code>str()</code>.</p>' +
                '<p><code>range(1, n + 1)</code> — числа от 1 до n включительно.</p>',
        prompt: 'Считай N. Выведи через пробел все чётные числа от 1 до N включительно.',
        examples: [{ inp: '10', out: '2 4 6 8 10' }],
        starter: 'n = int(input())\nres = []\n\n# перебери числа и собери чётные\n\nprint(" ".join(res))\n',
        tests: [
          { stdin: '10', expected: '2 4 6 8 10' },
          { stdin: '5', expected: '2 4' },
          { stdin: '2', expected: '2' },
          { stdin: '20', expected: '2 4 6 8 10 12 14 16 18 20' }
        ],
        hint: 'Внутри цикла: if i % 2 == 0: res.append(str(i)).',
        solution: 'n = int(input())\nres = []\nfor i in range(1, n + 1):\n    if i % 2 == 0:\n        res.append(str(i))\nprint(" ".join(res))'
      },
      {
        id: 'm2t2',
        level: 'легко',
        title: 'Максимум без max()',
        subtitle: 'алгоритм поиска максимума',
        theory: '<p>Идея поиска максимума: запомнить первый элемент как «лучший», затем сравнивать с ним каждый следующий ' +
                'и заменять, если встретился больше.</p>' +
                '<p><code>[int(x) for x in input().split()]</code> превращает строку чисел в список чисел.</p>',
        prompt: 'Ввод: числа через пробел (одна строка, не меньше двух). Выведи наибольшее, не используя <code>max()</code>.',
        examples: [{ inp: '4 9 2 7', out: '9' }],
        starter: 'nums = [int(x) for x in input().split()]\nbest = nums[0]\n\n# сравни с остальными\n\nprint(best)\n',
        tests: [
          { stdin: '4 9 2 7', expected: '9' },
          { stdin: '-5 -2 -9', expected: '-2' },
          { stdin: '1 1 1', expected: '1' },
          { stdin: '100 3', expected: '100' }
        ],
        hint: 'for v in nums: if v > best: best = v',
        solution: 'nums = [int(x) for x in input().split()]\nbest = nums[0]\nfor v in nums:\n    if v > best:\n        best = v\nprint(best)'
      },
      {
        id: 'm2t3',
        level: 'средне',
        title: 'Сортировка пузырьком',
        subtitle: 'обмен элементов, вложенные циклы',
        theory: '<p>Пузырёк: проходим по списку и меняем местами соседей, если они стоят неправильно. ' +
                'За один проход самый большой элемент «всплывает» в конец. Проходов нужно столько же, сколько элементов.</p>' +
                '<p>Обмен двух значений в Python короткий: <code>a, b = b, a</code>.</p>',
        prompt: 'Ввод: числа через пробел. Отсортируй их по возрастанию <b>сам</b> (пузырьком, без <code>sort()</code> и <code>sorted()</code>) ' +
                'и выведи через пробел.',
        examples: [{ inp: '5 1 4 2 8', out: '1 2 4 5 8' }],
        starter: 'nums = [int(x) for x in input().split()]\n\n# двойной цикл и обмен соседей\n\nprint(" ".join(str(x) for x in nums))\n',
        tests: [
          { stdin: '5 1 4 2 8', expected: '1 2 4 5 8' },
          { stdin: '3 3 1', expected: '1 3 3' },
          { stdin: '-1 0 -5', expected: '-5 -1 0' },
          { stdin: '9 8 7 6 5 4 3 2 1', expected: '1 2 3 4 5 6 7 8 9' }
        ],
        hint: 'Внешний цикл for i in range(len(nums)): внутренний for j in range(len(nums) - 1): ' +
              'если nums[j] > nums[j + 1], поменяй их местами.',
        solution: 'nums = [int(x) for x in input().split()]\nfor i in range(len(nums)):\n    for j in range(len(nums) - 1):\n        if nums[j] > nums[j + 1]:\n            nums[j], nums[j + 1] = nums[j + 1], nums[j]\nprint(" ".join(str(x) for x in nums))'
      },
      {
        id: 'm2t4',
        level: 'средне',
        title: 'Бинарный поиск',
        subtitle: 'log₂n вместо перебора, границы left/right',
        theory: '<p>Бинарный поиск работает в <b>отсортированном</b> списке: смотрим в середину и отбрасываем половину, ' +
                'где искомого быть не может. Держим две границы: <code>left</code> и <code>right</code>, ' +
                'пока <code>left &lt;= right</code>.</p>' +
                '<p>Середина: <code>mid = (left + right) // 2</code>. Если <code>nums[mid] == x</code> — нашли индекс.</p>',
        prompt: 'Первая строка — числа по возрастанию. Вторая строка — искомое число. ' +
                'Выведи индекс этого числа (нумерация с нуля) или <code>-1</code>, если его нет. Используй бинарный поиск.',
        examples: [{ inp: '1 3 5 7 9\n7', out: '3' }, { inp: '1 3 5 7 9\n4', out: '-1' }],
        starter: 'nums = [int(x) for x in input().split()]\nx = int(input())\nleft = 0\nright = len(nums) - 1\nanswer = -1\n\n# цикл двоичного поиска\n\nprint(answer)\n',
        tests: [
          { stdin: '1 3 5 7 9\n7', expected: '3' },
          { stdin: '1 3 5 7 9\n4', expected: '-1' },
          { stdin: '1 3 5 7 9\n1', expected: '0' },
          { stdin: '1 3 5 7 9\n9', expected: '4' },
          { stdin: '2 4 6 8 10 12 14\n2', expected: '0' }
        ],
        hint: 'Если nums[mid] == x: answer = mid и break. Если nums[mid] < x: left = mid + 1, иначе right = mid - 1.',
        solution: 'nums = [int(x) for x in input().split()]\nx = int(input())\nleft = 0\nright = len(nums) - 1\nanswer = -1\nwhile left <= right:\n    mid = (left + right) // 2\n    if nums[mid] == x:\n        answer = mid\n        break\n    if nums[mid] < x:\n        left = mid + 1\n    else:\n        right = mid - 1\nprint(answer)'
      },
      {
        id: 'm2t5',
        level: 'средне',
        title: 'Факториал рекурсией',
        subtitle: 'рекурсия и база',
        theory: '<p>Рекурсивная функция вызывает сама себя с меньшим аргументом. Обязательны два куска: ' +
                '<b>база</b> (когда ответ известен сразу) и <b>шаг</b> (как свести задачу к меньшей).</p>' +
                '<p>Факториал: <code>n! = n · (n − 1)!</code>, база — <code>0! = 1</code> и <code>1! = 1</code>.</p>',
        prompt: 'Считай N (0 ≤ N ≤ 12). Выведи N! — факториал числа, вычисленный функцией с рекурсией.',
        examples: [{ inp: '5', out: '120' }],
        starter: 'def fact(n):\n    # база и шаг\n    return 1\n\n\nn = int(input())\nprint(fact(n))\n',
        tests: [
          { stdin: '5', expected: '120' },
          { stdin: '0', expected: '1' },
          { stdin: '1', expected: '1' },
          { stdin: '10', expected: '3628800' }
        ],
        hint: 'if n <= 1: return 1, иначе return n * fact(n - 1).',
        solution: 'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\n\nn = int(input())\nprint(fact(n))'
      },
      {
        id: 'm2t6',
        level: 'средне',
        title: 'НОД по Евклиду',
        subtitle: 'алгоритм, который старше компьютеров',
        theory: '<p>Алгоритм Евклида: <code>НОД(a, b) = НОД(b, a % b)</code>, а когда остаток стал нулём — ' +
                'ответ это предыдущее число.</p>' +
                '<p>Пример: НОД(48, 18) → 48 % 18 = 12 → 18 % 12 = 6 → 12 % 6 = 0. Ответ 6.</p>',
        prompt: 'Ввод: два натуральных числа через пробел. Выведи их наибольший общий делитель.',
        examples: [{ inp: '48 18', out: '6' }],
        starter: 'a, b = [int(x) for x in input().split()]\n\nwhile b != 0:\n    # обмен по Евклиду\n    pass\n\nprint(a)\n',
        tests: [
          { stdin: '48 18', expected: '6' },
          { stdin: '7 13', expected: '1' },
          { stdin: '100 10', expected: '10' },
          { stdin: '17 17', expected: '17' }
        ],
        hint: 'Внутри цикла: a, b = b, a % b. Когда цикл закончится, в a будет НОД.',
        solution: 'a, b = [int(x) for x in input().split()]\nwhile b != 0:\n    a, b = b, a % b\nprint(a)'
      }
    ]
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = global.PYMODULES;
})(typeof window !== 'undefined' ? window : globalThis);
