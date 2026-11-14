window.CPP_TASKS = [
  {
    id: 'cpp1', level: 'легко',
    title: 'Первая программа',
    subtitle: 'cout, endl и точка с запятой',
    theory: '<p>Любая программа на C++ начинается с функции <code>main()</code> — с неё компьютер начинает выполнение.</p>' +
      '<p><code>cout &lt;&lt; "текст";</code> печатает текст на экран. Оператор <code>&lt;&lt;</code> можно повторять цепочкой: ' +
      '<code>cout &lt;&lt; "a" &lt;&lt; "b";</code> выведет <code>ab</code> в одну строку. <code>endl</code> переводит строку.</p>' +
      '<p>Две вещи, без которых C++ не компилируется: <b>точка с запятой</b> после каждого действия и <b>фигурные скобки</b> вокруг тела функции.</p>' +
      '<p><code>#include &lt;iostream&gt;</code> и <code>using namespace std;</code> подключают библиотеку ввода-вывода — в тренажёре эти строки можно писать, но и без них всё работает.</p>',
    prompt: 'Выведи на экран одну строку: <code>Привет, квантум!</code> и переведи строку в конце.',
    examples: [{ label: 'Что должно получиться', text: 'Привет, квантум!' }],
    hint: 'Внутри main() напиши cout << "Привет, квантум!" << endl; — и не забудь точку с запятой.',
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // выведи приветствие\n\n    return 0;\n}\n',
    solution: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Привет, квантум!" << endl;\n    return 0;\n}\n',
    tests: [{ stdin: '', expected: 'Привет, квантум!\n' }]
  },
  {
    id: 'cpp2', level: 'легко',
    title: 'Ввод: cin',
    subtitle: 'программа, которая слушает',
    theory: '<p><code>cin &gt;&gt; x;</code> читает значение из ввода в переменную. Стрелки <code>&gt;&gt;</code> «текут» от ввода к переменной, а <code>&lt;&lt;</code> — от значения к экрану.</p>' +
      '<p>Переменную сначала объявляют с типом: <code>int a;</code> — целое число. Можно объявить сразу несколько: <code>int a, b;</code></p>' +
      '<p><code>cin &gt;&gt; a &gt;&gt; b;</code> читает два числа подряд — их можно вводить в одной строке через пробел или в разных строках.</p>',
    prompt: 'Прочитай <b>два целых числа</b> из ввода и выведи их <b>сумму</b>.',
    examples: [{ label: 'Ввод', text: '4 9' }, { label: 'Вывод', text: '13' }],
    hint: 'int a, b; cin >> a >> b; cout << a + b << endl;',
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    // выведи сумму\n\n    return 0;\n}\n',
    solution: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: '4 9', expected: '13\n' },
      { stdin: '100 -30', expected: '70\n' },
      { stdin: '0 0', expected: '0\n' }
    ]
  },
  {
    id: 'cpp3', level: 'средне',
    title: 'Два деления',
    subtitle: 'int и double — разница важна',
    theory: '<p>Если оба числа целые (<code>int</code>), деление <code>/</code> отбрасывает дробную часть: <code>7 / 2</code> даёт <code>3</code>, а не <code>3.5</code>. Это не ошибка, это правило типов.</p>' +
      '<p><code>%</code> — остаток от деления: <code>7 % 2</code> равно <code>1</code>. Работает только с целыми.</p>' +
      '<p>Если хотя бы одно число вещественное (<code>double</code>), деление обычное. Поэтому пишут <code>a * 1.0 / b</code> — умножение на 1.0 превращает int в double.</p>',
    prompt: 'Прочитай <b>a</b> и <b>b</b>. Выведи в одну строку через пробел: <b>a/b</b> (целое), <b>a%b</b> (остаток) и <b>a/b</b> (вещественное).',
    examples: [{ label: 'Ввод', text: '7 2' }, { label: 'Вывод', text: '3 1 3.5' }],
    hint: 'cout << a / b << " " << a % b << " " << a * 1.0 / b << endl;',
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    // три числа через пробел\n\n    return 0;\n}\n',
    solution: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a / b << " " << a % b << " " << a * 1.0 / b << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: '7 2', expected: '3 1 3.5\n' },
      { stdin: '7 3', expected: '2 1 2.33333\n' },
      { stdin: '100 10', expected: '10 0 10\n' }
    ]
  },
  {
    id: 'cpp4', level: 'легко',
    title: 'Условие if/else',
    subtitle: 'ветвление',
    theory: '<p><code>if (условие) { … } else { … }</code> — программа выбирает одну из двух дорог.</p>' +
      '<p>Сравнения: <code>==</code> (равно, две штуки!), <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>. ' +
      'Одиночное <code>=</code> — это присваивание, а не сравнение: перепутать их — классическая ошибка.</p>' +
      '<p>Чётность проверяют остатком: <code>n % 2 == 0</code>.</p>',
    prompt: 'Прочитай целое число. Выведи <code>чётное</code>, если оно делится на 2, иначе <code>нечётное</code>.',
    examples: [{ label: 'Ввод 4', text: 'чётное' }, { label: 'Ввод 7', text: 'нечётное' }],
    hint: 'if (n % 2 == 0) { … } else { … }',
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // проверь n % 2\n\n    return 0;\n}\n',
    solution: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    if (n % 2 == 0) cout << "чётное" << endl;\n    else cout << "нечётное" << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: '4', expected: 'чётное\n' },
      { stdin: '7', expected: 'нечётное\n' },
      { stdin: '0', expected: 'чётное\n' }
    ]
  },
  {
    id: 'cpp5', level: 'легко',
    title: 'Цикл for',
    subtitle: 'повторение по счётчику',
    theory: '<p><code>for (начало; условие; шаг)</code> — три части в скобках: с чего начинаем, пока что продолжаем, как меняем счётчик после каждого круга.</p>' +
      '<p><code>for (int i = 1; i &lt;= n; i++)</code> — счётчик i идёт от 1 до n включительно. <code>i++</code> значит «увеличить на 1».</p>' +
      '<p>Накопитель объявляют <b>до</b> цикла и обнуляют: <code>int sum = 0;</code> — иначе там окажется непонятно что.</p>',
    prompt: 'Прочитай <b>n</b> и выведи сумму чисел от 1 до n включительно.',
    examples: [{ label: 'Ввод 10', text: '55' }, { label: 'Как считает', text: '1+2+…+10 = 55' }],
    hint: 'int sum = 0; for (int i = 1; i <= n; i++) sum += i;',
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int sum = 0;\n    // цикл от 1 до n\n\n    cout << sum << endl;\n    return 0;\n}\n',
    solution: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int sum = 0;\n    for (int i = 1; i <= n; i++) sum += i;\n    cout << sum << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: '10', expected: '55\n' },
      { stdin: '1', expected: '1\n' },
      { stdin: '100', expected: '5050\n' }
    ]
  },
  {
    id: 'cpp6', level: 'средне',
    title: 'Цикл while и цифры',
    subtitle: 'пока условие верно',
    theory: '<p><code>while (условие)</code> повторяет тело, пока условие истинно. Сколько раз — заранее неизвестно.</p>' +
      '<p>Классический приём: «разбирать» число по цифрам. <code>n % 10</code> — последняя цифра, <code>n / 10</code> — число без неё. ' +
      'Делим, пока <code>n &gt; 0</code>, и число тает.</p>' +
      '<p>Осторожно: если условие никогда не станет ложным, получится бесконечный цикл — тренажёр его остановит с подсказкой.</p>',
    prompt: 'Прочитай целое число и выведи <b>сумму его цифр</b>. Пример: 9875 → 29.',
    examples: [{ label: 'Ввод 9875', text: '29' }],
    hint: 'while (n > 0) { sum += n % 10; n /= 10; }',
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int sum = 0;\n    // разбери число по цифрам\n\n    cout << sum << endl;\n    return 0;\n}\n',
    solution: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int sum = 0;\n    while (n > 0) {\n        sum += n % 10;\n        n /= 10;\n    }\n    cout << sum << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: '9875', expected: '29\n' },
      { stdin: '9', expected: '9\n' },
      { stdin: '1000000', expected: '1\n' }
    ]
  },
  {
    id: 'cpp7', level: 'средне',
    title: 'Массив',
    subtitle: 'много чисел сразу',
    theory: '<p>Массив — коробка с несколькими значениями одного типа. <code>int a[100];</code> создаёт сто ячеек, нумеруются они <b>с нуля</b>: <code>a[0]</code> … <code>a[99]</code>.</p>' +
      '<p>Порядок работы: прочитать сколько чисел, затем в цикле разложить их по ячейкам, затем пройтись по ним ещё раз для ответа.</p>' +
      '<p>Если задать значения сразу: <code>int a[5] = {3, 7, 1, 9, 4};</code></p>',
    prompt: 'Сначала прочитай <b>n</b> — сколько чисел будет дальше. Затем сами <b>n чисел</b>. Выведи <b>максимальное</b> из них.',
    examples: [{ label: 'Ввод', text: '5\n3 7 1 9 4' }, { label: 'Вывод', text: '9' }],
    hint: 'Максимум начинай с a[0], затем сравнивай каждый элемент: if (a[i] > mx) mx = a[i];',
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int a[1000];\n    for (int i = 0; i < n; i++) cin >> a[i];\n\n    // найди максимум и выведи его\n\n    return 0;\n}\n',
    solution: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int a[1000];\n    for (int i = 0; i < n; i++) cin >> a[i];\n    int mx = a[0];\n    for (int i = 1; i < n; i++) {\n        if (a[i] > mx) mx = a[i];\n    }\n    cout << mx << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: '5\n3 7 1 9 4', expected: '9\n' },
      { stdin: '3\n-5 -2 -9', expected: '-2\n' },
      { stdin: '1\n42', expected: '42\n' }
    ]
  },
  {
    id: 'cpp8', level: 'средне',
    title: 'vector — растущий массив',
    subtitle: 'push_back и size()',
    theory: '<p><code>vector&lt;int&gt;</code> — массив, который сам растёт. Размер указывать не нужно.</p>' +
      '<p><code>v.push_back(x)</code> добавляет x в конец, <code>v.size()</code> сообщает, сколько элементов, <code>v[i]</code> даёт доступ по индексу.</p>' +
      '<p>Так удобно делить числа на группы: то, что подходит под условие, отправляем в вектор, остальное выбрасываем.</p>',
    prompt: 'Прочитай <b>n</b>, затем <b>n чисел</b>. Собери в vector только положительные. Выведи через пробел: <b>сколько их</b> и <b>их сумму</b>.',
    examples: [{ label: 'Ввод', text: '6\n3 -1 4 -2 5 0' }, { label: 'Вывод', text: '3 12' }],
    hint: 'Если x > 0 — v.push_back(x) и прибавляй к сумме. Ответ: v.size() и sum.',
    starter: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> v;\n    int sum = 0;\n\n    // читай числа и собирай положительные\n\n    cout << v.size() << " " << sum << endl;\n    return 0;\n}\n',
    solution: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> v;\n    int sum = 0;\n    for (int i = 0; i < n; i++) {\n        int x;\n        cin >> x;\n        if (x > 0) {\n            v.push_back(x);\n            sum += x;\n        }\n    }\n    cout << v.size() << " " << sum << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: '6\n3 -1 4 -2 5 0', expected: '3 12\n' },
      { stdin: '3\n-1 -2 -3', expected: '0 0\n' },
      { stdin: '4\n10 20 30 40', expected: '4 100\n' }
    ]
  },
  {
    id: 'cpp9', level: 'сложно',
    title: 'Своя функция',
    subtitle: 'bool isPrime(int n)',
    theory: '<p>Функция — это кусок программы с именем. Ей передают данные (параметры), она возвращает результат: <code>bool isPrime(int n)</code>.</p>' +
      '<p>Внутри — <code>return</code> с ответом; как только он сработал, функция сразу заканчивается.</p>' +
      '<p>Проверка простоты: число не делится нацело ни на одно от 2 до корня из него. Удобно писать условие цикла как <code>i * i &lt;= n</code> — тогда корень считать не нужно.</p>',
    prompt: 'Допиши функцию <b>isPrime</b>: она возвращает true, если число простое. Затем программа выведет все простые числа от 2 до n. Прочитай n из ввода.',
    examples: [{ label: 'Ввод 20', text: '2 3 5 7 11 13 17 19' }],
    hint: 'if (n < 2) return false; затем for (int i = 2; i * i <= n; i++) if (n % i == 0) return false; и в конце return true;',
    starter: '#include <iostream>\nusing namespace std;\n\nbool isPrime(int n) {\n    // верни true, если n простое\n    return false;\n}\n\nint main() {\n    int n;\n    cin >> n;\n    for (int i = 2; i <= n; i++) {\n        if (isPrime(i)) cout << i << " ";\n    }\n    cout << endl;\n    return 0;\n}\n',
    solution: '#include <iostream>\nusing namespace std;\n\nbool isPrime(int n) {\n    if (n < 2) return false;\n    for (int i = 2; i * i <= n; i++) {\n        if (n % i == 0) return false;\n    }\n    return true;\n}\n\nint main() {\n    int n;\n    cin >> n;\n    for (int i = 2; i <= n; i++) {\n        if (isPrime(i)) cout << i << " ";\n    }\n    cout << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: '20', expected: '2 3 5 7 11 13 17 19 \n' },
      { stdin: '2', expected: '2 \n' },
      { stdin: '30', expected: '2 3 5 7 11 13 17 19 23 29 \n' }
    ]
  },
  {
    id: 'cpp10', level: 'средне',
    title: 'Строки',
    subtitle: 'string и длина',
    theory: '<p><code>string</code> хранит текст. <code>s.size()</code> — сколько в строке символов, <code>s[i]</code> — символ с номером i (с нуля, как в массиве).</p>' +
      '<p>Строку можно склеивать: <code>s += "!"</code> или <code>string t = s + "!"</code>. Сравнивать: <code>s == "да"</code>.</p>' +
      '<p>Обратный проход — это цикл от <code>s.size() - 1</code> до 0. Индекс — целое число, поэтому <code>s.size()</code> в выражении работает как число.</p>' +
      '<p>Важно: в настоящем C++ <code>char</code> — это <b>один байт</b>, а русская буква в UTF-8 занимает два. Поэтому в заданиях со строками берут латиницу: иначе переворот по символам ломает буквы.</p>',
    prompt: 'Прочитай одно слово латиницей и выведи его <b>задом наперёд</b>.',
    examples: [{ label: 'Ввод', text: 'kvantum' }, { label: 'Вывод', text: 'mutnavk' }],
    hint: 'for (int i = s.size() - 1; i >= 0; i--) cout << s[i];',
    starter: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    cin >> s;\n\n    // выведи строку в обратном порядке\n\n    return 0;\n}\n',
    solution: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    cin >> s;\n    for (int i = s.size() - 1; i >= 0; i--) {\n        cout << s[i];\n    }\n    cout << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: 'kvantum', expected: 'mutnavk\n' },
      { stdin: 'ab', expected: 'ba\n' },
      { stdin: 'x', expected: 'x\n' }
    ]
  },
  {
    id: 'cpp11', level: 'сложно',
    title: 'Рекурсия: НОД',
    subtitle: 'функция вызывает себя',
    theory: '<p>Рекурсия — когда функция вызывает саму себя с задачей поменьше. Обязательны две части: <b>база</b> (когда останавливаться) и <b>шаг</b> (как уменьшить задачу).</p>' +
      '<p>Алгоритм Евклида: НОД(a, b) = НОД(b, a % b), а база — когда b равно 0, тогда ответ a. Пример: НОД(48, 18) → НОД(18, 12) → НОД(12, 6) → НОД(6, 0) = 6.</p>' +
      '<p>Без базы рекурсия уйдёт в бесконечность — тренажёр остановит её и скажет об этом.</p>',
    prompt: 'Допиши рекурсивную функцию <b>gcd(a, b)</b> — наибольший общий делитель. Прочитай a и b, выведи ответ.',
    examples: [{ label: 'Ввод', text: '48 18' }, { label: 'Вывод', text: '6' }],
    hint: 'if (b == 0) return a; return gcd(b, a % b);',
    starter: '#include <iostream>\nusing namespace std;\n\nint gcd(int a, int b) {\n    // база и рекурсивный шаг\n    return 0;\n}\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << gcd(a, b) << endl;\n    return 0;\n}\n',
    solution: '#include <iostream>\nusing namespace std;\n\nint gcd(int a, int b) {\n    if (b == 0) return a;\n    return gcd(b, a % b);\n}\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << gcd(a, b) << endl;\n    return 0;\n}\n',
    tests: [
      { stdin: '48 18', expected: '6\n' },
      { stdin: '7 5', expected: '1\n' },
      { stdin: '100 100', expected: '100\n' }
    ]
  }
];
