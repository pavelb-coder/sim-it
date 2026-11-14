function cppLines(arr) { return arr.join('\n'); }

window.CPP_TASKS = [
  {
    id: 'cpp1', level: 1,
    title: 'Привет, C++',
    subtitle: 'первая программа и cout',
    theory: '<p>Программа на C++ начинается с функции <code>int main()</code> — с неё компьютер начинает выполнение. Фигурные скобки <code>{ }</code> задают тело функции, каждая команда заканчивается точкой с запятой.</p>' +
      '<p><code>#include &lt;iostream&gt;</code> подключает библиотеку ввода-вывода, <code>using namespace std;</code> избавляет от приставки <code>std::</code>.</p>' +
      '<p><code>cout &lt;&lt; "текст" &lt;&lt; endl;</code> — вывод. Оператор <code>&lt;&lt;</code> «отправляет» данные в поток вывода, <code>endl</code> переводит строку. Можно склеивать сколько угодно частей: <code>cout &lt;&lt; "x = " &lt;&lt; 5 &lt;&lt; endl;</code></p>' +
      '<p><b>Компилятор строг:</b> пропущенная точка с запятой — и программа не соберётся. Зато ошибка всегда указывает номер строки.</p>',
    prompt: 'Выведи на экран строку <b>Привет, квантум!</b> с переводом строки в конце.',
    examples: [{ label: 'Ожидаемый вывод', text: 'Привет, квантум!' }],
    hint: 'Текст пишется в двойных кавычках, после него — << endl.',
    starter: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    // твой код здесь',
      '    return 0;',
      '}'
    ]),
    solution: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    cout << "Привет, квантум!" << endl;',
      '    return 0;',
      '}'
    ]),
    tests: [{ input: '', expected: 'Привет, квантум!' }]
  },
  {
    id: 'cpp2', level: 1,
    title: 'Переменные и ввод',
    subtitle: 'int и cin',
    theory: '<p>Переменная объявляется с типом: <code>int a = 5;</code> — целое число, <code>double x = 2.5;</code> — дробное, <code>string s = "текст";</code> — строка, <code>bool ok = true;</code> — логическое.</p>' +
      '<p><b>int</b> хранит только целые: <code>7 / 2</code> даст <code>3</code>, а не 3.5 — дробная часть отбрасывается. Чтобы получить 3.5, нужно, чтобы хотя бы одно число было <code>double</code>.</p>' +
      '<p><code>cin &gt;&gt; a &gt;&gt; b;</code> читает числа из потока ввода, разделяя их пробелами или переводами строк.</p>',
    prompt: 'Программа получает <b>два целых числа</b> и должна вывести их <b>сумму</b>.',
    examples: [{ label: 'Ввод', text: '2 3' }, { label: 'Вывод', text: '5' }],
    hint: 'Объяви две переменные через int, прочитай их cin, выведи a + b.',
    starter: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    int a, b;',
      '    cin >> a >> b;',
      '    // выведи сумму',
      '    return 0;',
      '}'
    ]),
    solution: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    int a, b;',
      '    cin >> a >> b;',
      '    cout << a + b << endl;',
      '    return 0;',
      '}'
    ]),
    tests: [
      { input: '2 3', expected: '5' },
      { input: '-5 5', expected: '0' },
      { input: '100 250', expected: '350' }
    ]
  },
  {
    id: 'cpp3', level: 2,
    title: 'Ветвление',
    subtitle: 'if / else if / else',
    theory: '<p>Условие в C++ — выражение в круглых скобках: <code>if (a &gt; b) { … } else { … }</code>. Если вариантов больше двух, между ними ставится <code>else if</code>.</p>' +
      '<p>Сравнения: <code>==</code> (равно), <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>. Внимание: <code>=</code> — это присваивание, а <code>==</code> — сравнение! Перепутать их — самая частая ошибка новичка.</p>' +
      '<p>Условия объединяются через <code>&amp;&amp;</code> (и) и <code>||</code> (или), отрицание — <code>!</code>.</p>',
    prompt: 'Программа получает <b>три целых числа</b> и выводит <b>наибольшее</b> из них.',
    examples: [{ label: 'Ввод', text: '3 9 5' }, { label: 'Вывод', text: '9' }],
    hint: 'Заведи переменную m = a, потом сравни её с b и с c — или используй max(max(a,b),c).',
    starter: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    int a, b, c;',
      '    cin >> a >> b >> c;',
      '    int m = a;',
      '    // сравни m с b и c',
      '    cout << m << endl;',
      '    return 0;',
      '}'
    ]),
    solution: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    int a, b, c;',
      '    cin >> a >> b >> c;',
      '    int m = a;',
      '    if (b > m) m = b;',
      '    if (c > m) m = c;',
      '    cout << m << endl;',
      '    return 0;',
      '}'
    ]),
    tests: [
      { input: '3 9 5', expected: '9' },
      { input: '7 7 2', expected: '7' },
      { input: '-1 -5 -3', expected: '-1' },
      { input: '4 4 4', expected: '4' }
    ]
  },
  {
    id: 'cpp4', level: 2,
    title: 'Цикл for',
    subtitle: 'сумма от 1 до N',
    theory: '<p>Цикл <code>for</code> собирает три части в одну строку: <code>for (int i = 0; i &lt; n; i++) { … }</code> — старт, условие продолжения, шаг.</p>' +
      '<p><code>i++</code> — то же, что <code>i = i + 1</code>. Тело повторяется, пока условие истинно; как только оно стало ложным — цикл закончился.</p>' +
      '<p>Накопитель объявляют <b>до</b> цикла: <code>int s = 0;</code>, а внутри прибавляют: <code>s += i;</code>. Это самый частый шаблон в программировании.</p>',
    prompt: 'Программа получает <b>целое N</b> и выводит <b>сумму чисел от 1 до N</b> включительно.',
    examples: [{ label: 'Ввод', text: '10' }, { label: 'Вывод', text: '55' }],
    hint: 'int s = 0; for (int i = 1; i <= n; i++) s += i;',
    starter: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    int n;',
      '    cin >> n;',
      '    int s = 0;',
      '    // цикл от 1 до n',
      '    cout << s << endl;',
      '    return 0;',
      '}'
    ]),
    solution: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    int n;',
      '    cin >> n;',
      '    int s = 0;',
      '    for (int i = 1; i <= n; i++) {',
      '        s += i;',
      '    }',
      '    cout << s << endl;',
      '    return 0;',
      '}'
    ]),
    tests: [
      { input: '10', expected: '55' },
      { input: '1', expected: '1' },
      { input: '100', expected: '5050' },
      { input: '0', expected: '0' }
    ]
  },
  {
    id: 'cpp5', level: 3,
    title: 'Своя функция',
    subtitle: 'void, return и параметры',
    theory: '<p>Функция — это кусок программы с именем. Объявление: <code>int gcd(int a, int b) { … }</code> — тип результата, имя, параметры в скобках.</p>' +
      '<p><code>return</code> возвращает значение и сразу завершает функцию. Если функция ничего не возвращает, её тип — <code>void</code>.</p>' +
      '<p>Аргументы передаются <b>по значению</b>: функция получает копии, оригиналы в <code>main</code> не меняются. Функцию нужно объявить <b>до</b> места вызова (или объявить прототип).</p>',
    prompt: 'Напиши функцию <code>int gcd(int a, int b)</code> — наибольший общий делитель — и выведи НОД двух чисел, прочитанных из ввода. Используй алгоритм Евклида: пока b ≠ 0, заменяй пару (a, b) на (b, a % b).',
    examples: [{ label: 'Ввод', text: '48 36' }, { label: 'Вывод', text: '12' }],
    hint: 'while (b != 0) { int t = b; b = a % b; a = t; } return a;',
    starter: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int gcd(int a, int b) {',
      '    // алгоритм Евклида',
      '    return a;',
      '}',
      '',
      'int main() {',
      '    int a, b;',
      '    cin >> a >> b;',
      '    cout << gcd(a, b) << endl;',
      '    return 0;',
      '}'
    ]),
    solution: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int gcd(int a, int b) {',
      '    while (b != 0) {',
      '        int t = b;',
      '        b = a % b;',
      '        a = t;',
      '    }',
      '    return a;',
      '}',
      '',
      'int main() {',
      '    int a, b;',
      '    cin >> a >> b;',
      '    cout << gcd(a, b) << endl;',
      '    return 0;',
      '}'
    ]),
    tests: [
      { input: '48 36', expected: '12' },
      { input: '17 5', expected: '1' },
      { input: '100 100', expected: '100' },
      { input: '1 999', expected: '1' }
    ]
  },
  {
    id: 'cpp6', level: 3,
    title: 'Массивы',
    subtitle: 'int a[100] и перебор',
    theory: '<p>Массив хранит много значений одного типа: <code>int a[100];</code> — сто целых. Нумерация <b>с нуля</b>: у массива из n элементов индексы от 0 до n−1. Обращение к <code>a[n]</code> — ошибка, C++ за неё не извиняется.</p>' +
      '<p>Размер массива фиксируется при объявлении и должен быть известен компилятору. Поэтому берут «с запасом» — например, 1000, а реальное количество читают в переменную n.</p>' +
      '<p>Шаблон «максимум»: завести <code>mx = a[0]</code> и в цикле обновлять, если встретилось большее.</p>',
    prompt: 'Программа получает <b>N</b>, затем <b>N целых чисел</b>. Выведи <b>наибольшее</b> из них.',
    examples: [{ label: 'Ввод', text: '5\n3 9 1 7 4' }, { label: 'Вывод', text: '9' }],
    hint: 'int a[1000]; for (int i=0;i<n;i++) cin >> a[i]; — потом ищи максимум.',
    starter: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    int n;',
      '    cin >> n;',
      '    int a[1000];',
      '    for (int i = 0; i < n; i++) {',
      '        cin >> a[i];',
      '    }',
      '    int mx = a[0];',
      '    // перебери остальные',
      '    cout << mx << endl;',
      '    return 0;',
      '}'
    ]),
    solution: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    int n;',
      '    cin >> n;',
      '    int a[1000];',
      '    for (int i = 0; i < n; i++) {',
      '        cin >> a[i];',
      '    }',
      '    int mx = a[0];',
      '    for (int i = 1; i < n; i++) {',
      '        if (a[i] > mx) mx = a[i];',
      '    }',
      '    cout << mx << endl;',
      '    return 0;',
      '}'
    ]),
    tests: [
      { input: '5\n3 9 1 7 4', expected: '9' },
      { input: '1\n42', expected: '42' },
      { input: '4\n-5 -2 -9 -1', expected: '-1' }
    ]
  },
  {
    id: 'cpp7', level: 3,
    title: 'Строки',
    subtitle: 'string и s.size()',
    theory: '<p><code>string</code> — это строка переменной длины. У неё есть методы: <code>s.size()</code> (длина), <code>s[i]</code> (символ по индексу), <code>s.substr(начало, сколько)</code> (кусок), <code>s.find("x")</code> (поиск).</p>' +
      '<p>Строки склеиваются через <code>+</code>, сравниваются через <code>==</code> и <code>&lt;</code>. Символ в двойных кавычках — это строка <code>"a"</code>, а в одинарных — <code>char</code> <code>\'a\'</code>: <code>s[0] == "a"</code> не скомпилируется, а <code>s[0] == \'a\'</code> — да.</p>' +
      '<p>Сравнение <code>s.size()</code> с числом: тип у длины беззнаковый, поэтому в учебном коде пишут приведение <code>(int)s.size()</code> — так надёжнее.</p>',
    prompt: 'Программа получает <b>одно слово</b>. Выведи его <b>в обратном порядке</b>.',
    examples: [{ label: 'Ввод', text: 'привет' }, { label: 'Вывод', text: 'тевирп' }],
    hint: 'Собери новую строку: for (int i = s.size()-1; i >= 0; i--) r += s[i];',
    starter: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    string s;',
      '    cin >> s;',
      '    string r = "";',
      '    // иди по строке с конца',
      '    cout << r << endl;',
      '    return 0;',
      '}'
    ]),
    solution: cppLines([
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    string s;',
      '    cin >> s;',
      '    string r = "";',
      '    for (int i = (int)s.size() - 1; i >= 0; i--) {',
      '        r += s[i];',
      '    }',
      '    cout << r << endl;',
      '    return 0;',
      '}'
    ]),
    tests: [
      { input: 'привет', expected: 'тевирп' },
      { input: 'abcd', expected: 'dcba' },
      { input: 'я', expected: 'я' }
    ]
  },
  {
    id: 'cpp8', level: 4,
    title: 'vector и сортировка',
    subtitle: 'контейнер вместо массива',
    theory: '<p><code>vector&lt;int&gt;</code> — «массив, который умеет расти». У него есть <code>push_back(x)</code>, <code>size()</code>, <code>pop_back()</code>, <code>clear()</code> — и его размер не нужно указывать заранее.</p>' +
      '<p>Чтение до конца ввода записывают так: <code>while (cin &gt;&gt; x) { v.push_back(x); }</code> — поток «ломается» на конце данных и цикл заканчивается.</p>' +
      '<p>Сортировка пузырьком: соседей сравнивают попарно и меняют местами, если стоят не по порядку. За n проходов массив упорядочивается. В реальном коде используют <code>sort(v.begin(), v.end())</code> из <code>&lt;algorithm&gt;</code>.</p>',
    prompt: 'Программа получает <b>N</b>, затем <b>N целых чисел</b>. Выведи их <b>по возрастанию через пробел</b> в одну строку.',
    examples: [{ label: 'Ввод', text: '5\n5 2 9 1 7' }, { label: 'Вывод', text: '1 2 5 7 9' }],
    hint: 'Пузырёк: два вложенных for, внутри — if (v[j] > v[j+1]) { поменять местами }.',
    starter: cppLines([
      '#include <iostream>',
      '#include <vector>',
      'using namespace std;',
      '',
      'int main() {',
      '    int n;',
      '    cin >> n;',
      '    vector<int> v;',
      '    for (int i = 0; i < n; i++) {',
      '        int x;',
      '        cin >> x;',
      '        v.push_back(x);',
      '    }',
      '    // отсортируй v',
      '    for (int i = 0; i < (int)v.size(); i++) {',
      '        cout << v[i] << " ";',
      '    }',
      '    cout << endl;',
      '    return 0;',
      '}'
    ]),
    solution: cppLines([
      '#include <iostream>',
      '#include <vector>',
      'using namespace std;',
      '',
      'int main() {',
      '    int n;',
      '    cin >> n;',
      '    vector<int> v;',
      '    for (int i = 0; i < n; i++) {',
      '        int x;',
      '        cin >> x;',
      '        v.push_back(x);',
      '    }',
      '    for (int i = 0; i < (int)v.size(); i++) {',
      '        for (int j = 0; j + 1 < (int)v.size() - i; j++) {',
      '            if (v[j] > v[j + 1]) {',
      '                int t = v[j];',
      '                v[j] = v[j + 1];',
      '                v[j + 1] = t;',
      '            }',
      '        }',
      '    }',
      '    for (int i = 0; i < (int)v.size(); i++) {',
      '        cout << v[i] << " ";',
      '    }',
      '    cout << endl;',
      '    return 0;',
      '}'
    ]),
    tests: [
      { input: '5\n5 2 9 1 7', expected: '1 2 5 7 9 ' },
      { input: '3\n3 2 1', expected: '1 2 3 ' },
      { input: '1\n0', expected: '0 ' },
      { input: '6\n10 -1 0 10 5 -1', expected: '-1 -1 0 5 10 10 ' }
    ]
  }
];
