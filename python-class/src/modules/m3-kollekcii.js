/* ==========================================================================
   Модуль 3 «Коллекции и строки» — словари, множества, сортировка, шифры.
   ========================================================================== */
(function (global) {
  'use strict';
  global.PYMODULES = global.PYMODULES || [];
  global.PYMODULES.push({
    id: 'm3',
    title: 'Модуль 3. Коллекции и строки',
    subtitle: 'словари, множества, нормализация текста, шифр Цезаря',
    tasks: [
      {
        id: 'm3t1',
        level: 'легко',
        title: 'Уникальные слова',
        subtitle: 'словарь как «уже встречалось»',
        theory: '<p>Словарь удобно использовать как отметку «слово уже было»: <code>seen = {}</code>, ' +
                'затем <code>if word not in seen:</code> — добавляем его в результат.</p>' +
                '<p>С 3.7 словарь помнит порядок вставки, но полагаться на это в учебной задаче не стоит — ' +
                'лучше явно собирать список.</p>',
        prompt: 'Считай строку слов. Выведи только уникальные слова через пробел, в порядке первого появления.',
        examples: [{ inp: 'кот пёс кот мышь пёс', out: 'кот пёс мышь' }],
        starter: 'words = input().split()\nseen = {}\nres = []\n\n# собери уникальные\n\nprint(" ".join(res))\n',
        tests: [
          { stdin: 'кот пёс кот мышь пёс', expected: 'кот пёс мышь' },
          { stdin: 'a a a', expected: 'a' },
          { stdin: 'один два три', expected: 'один два три' },
          { stdin: 'x y x z y', expected: 'x y z' }
        ],
        hint: 'for w in words: if w not in seen: seen[w] = True; res.append(w)',
        solution: 'words = input().split()\nseen = {}\nres = []\nfor w in words:\n    if w not in seen:\n        seen[w] = True\n        res.append(w)\nprint(" ".join(res))'
      },
      {
        id: 'm3t2',
        level: 'легко',
        title: 'Сколько разных букв',
        subtitle: 'множество set()',
        theory: '<p>Множество <code>set</code> хранит только уникальные элементы: <code>set("абракадабра")</code> — ' +
                'это набор неповторяющихся букв. У множества есть длина, и в нём можно проверять наличие: ' +
                '<code>"а" in s</code>.</p>' +
                '<p>Множество удобно там, где важен только факт «есть / нет», а не порядок.</p>',
        prompt: 'Считай слово. Выведи количество <b>разных</b> букв в нём (регистр важен: «А» и «а» — разные).',
        examples: [{ inp: 'абракадабра', out: '5' }],
        starter: 'word = input()\n\n# множество букв и его длина\n',
        tests: [
          { stdin: 'абракадабра', expected: '5' },
          { stdin: 'ааа', expected: '1' },
          { stdin: 'abc', expected: '3' },
          { stdin: 'Аа', expected: '2' },
          { stdin: 'привет', expected: '6' }
        ],
        hint: 'print(len(set(word)))',
        solution: 'word = input()\nprint(len(set(word)))'
      },
      {
        id: 'm3t3',
        level: 'средне',
        title: 'Самое частое слово',
        subtitle: 'частоты + правило ничьей',
        theory: '<p>Считаем частоты в словаре: <code>counts[w] = counts.get(w, 0) + 1</code>.</p>' +
                '<p>Затем идём по <code>sorted(counts)</code> — ключи по алфавиту — и берём слово с максимальным счётчиком. ' +
                'Если строго больше (<code>&gt;</code>), то при равенстве останется первое по алфавиту: это и есть правило ничьей.</p>',
        prompt: 'Считай строку слов. Выведи слово, которое встречается чаще всех. ' +
                'Если таких несколько — то, что раньше по алфавиту.',
        examples: [{ inp: 'кот пёс кот мышь', out: 'кот' }, { inp: 'б а б а', out: 'а' }],
        starter: 'words = input().split()\ncounts = {}\n\n# посчитай частоты\n\nbest = ""\nbest_n = 0\nprint(best)\n',
        tests: [
          { stdin: 'кот пёс кот мышь', expected: 'кот' },
          { stdin: 'б а б а', expected: 'а' },
          { stdin: 'раз два три', expected: 'два' },
          { stdin: 'я я ты мы', expected: 'я' }
        ],
        hint: 'for w in sorted(counts): if counts[w] > best_n: best = w; best_n = counts[w]',
        solution: 'words = input().split()\ncounts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\nbest = ""\nbest_n = 0\nfor w in sorted(counts):\n    if counts[w] > best_n:\n        best = w\n        best_n = counts[w]\nprint(best)'
      },
      {
        id: 'm3t4',
        level: 'легко',
        title: 'Нормализация текста',
        subtitle: 'split / title / join',
        theory: '<p><code>split()</code> без аргумента сам убирает лишние пробелы и режет по любому их количеству.</p>' +
                '<p><code>title()</code> делает каждое слово с большой буквы, <code>" ".join(...)</code> собирает обратно ' +
                'с ровно одним пробелом между словами.</p>',
        prompt: 'Считай строку с лишними пробелами. Выведи её же, но с одним пробелом между словами ' +
                'и с большой буквы в каждом слове.',
        examples: [{ inp: '  привет   мир  ', out: 'Привет Мир' }],
        starter: 'text = input()\nwords = text.split()\n\n# нормализуй и склей\n',
        tests: [
          { stdin: '  привет   мир  ', expected: 'Привет Мир' },
          { stdin: 'python это просто', expected: 'Python Это Просто' },
          { stdin: 'один', expected: 'Один' },
          { stdin: 'a   b     c', expected: 'A B C' }
        ],
        hint: 'Нужен список из w.title() для каждого слова, затем " ".join(список).',
        solution: 'text = input()\nwords = text.split()\nres = []\nfor w in words:\n    res.append(w.title())\nprint(" ".join(res))'
      },
      {
        id: 'm3t5',
        level: 'средне',
        title: 'Шифр Цезаря',
        subtitle: 'ord / chr, работа с кодами символов',
        theory: '<p>У каждого символа есть числовой код: <code>ord("a")</code> → 97, <code>chr(98)</code> → "b".</p>' +
                '<p>Сдвиг буквы на k: <code>chr((ord(ch) - ord("a") + k) % 26 + ord("a"))</code>. ' +
                'Остаток <code>% 26</code> нужен, чтобы после «z» снова шла «a».</p>',
        prompt: 'Первая строка — слово из маленьких латинских букв. Вторая — сдвиг k (0–25). ' +
                'Зашифруй слово шифром Цезаря и выведи результат.',
        examples: [{ inp: 'abc\n2', out: 'cde' }, { inp: 'xyz\n3', out: 'abc' }],
        starter: 'word = input()\nk = int(input())\nres = ""\n\n# сдвинь каждую букву\n\nprint(res)\n',
        tests: [
          { stdin: 'abc\n2', expected: 'cde' },
          { stdin: 'xyz\n3', expected: 'abc' },
          { stdin: 'hello\n0', expected: 'hello' },
          { stdin: 'python\n13', expected: 'clguba' }
        ],
        hint: 'base = ord("a"); для каждой буквы: code = ord(ch) - base; code = (code + k) % 26; res += chr(code + base).',
        solution: 'word = input()\nk = int(input())\nres = ""\nbase = ord("a")\nfor ch in word:\n    code = (ord(ch) - base + k) % 26\n    res += chr(code + base)\nprint(res)'
      },
      {
        id: 'm3t6',
        level: 'средне',
        title: 'Второй по величине',
        subtitle: 'уникальные значения и сортировка',
        theory: '<p>Задача с подвохом: «второй по величине» — это второе <b>различное</b> значение, ' +
                'а не второй элемент списка.</p>' +
                '<p>Самый короткий путь: <code>nums = sorted(set(nums))</code> — уникальные по возрастанию, ' +
                'затем предпоследний элемент <code>nums[-2]</code>.</p>',
        prompt: 'Ввод: числа через пробел (не меньше двух различных). Выведи второе по величине значение.',
        examples: [{ inp: '5 9 9 2', out: '5' }],
        starter: 'nums = [int(x) for x in input().split()]\n\n# уникальные по возрастанию\n',
        tests: [
          { stdin: '5 9 9 2', expected: '5' },
          { stdin: '1 2 3', expected: '2' },
          { stdin: '10 10 10 7', expected: '7' },
          { stdin: '-1 -5 -3', expected: '-3' }
        ],
        hint: 'u = sorted(set(nums)); print(u[-2])',
        solution: 'nums = [int(x) for x in input().split()]\nu = sorted(set(nums))\nprint(u[-2])'
      }
    ]
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = global.PYMODULES;
})(typeof window !== 'undefined' ? window : globalThis);
