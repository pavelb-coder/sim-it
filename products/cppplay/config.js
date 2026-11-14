/* C++-песочница: примеры, шпаргалка и подключение движка CppEngine. */
(function (global) {
  'use strict';

  var CHEAT = [
    '#include <iostream>        подключить ввод-вывод',
    'using namespace std;       писать cout вместо std::cout',
    '',
    'int a = 5;  double x = 1.5;  char c = \'A\';',
    'bool ok = true;  string s = "текст";',
    '',
    'cout << "текст" << a << endl;   вывод',
    'cin >> a >> b;                  ввод двух чисел',
    '',
    'if (a % 2 == 0) { … } else { … }',
    'for (int i = 0; i < n; i++) { … }',
    'while (n > 0) { … }',
    '',
    'int a[10];                  массив на 10 ячеек (0…9)',
    'int m[5][5];                двумерный массив',
    'vector<int> v;  v.push_back(x);  v.size();  v[i];',
    '',
    'int gcd(int a, int b) {      своя функция (объявляй до main)',
    '    return b == 0 ? a : gcd(b, a % b);',
    '}',
    '',
    'a / b   целое деление    a % b   остаток',
    'a * 1.0 / b   вещественное    (int)x   приведение',
    's.size()  s.substr(0, 3)  s[i]',
    'abs/sqrt/pow/min/max/floor/ceil/round/to_string'
  ].join('\n');

  var NOTE = '<p style="margin:0 0 8px">Код не отправляется на сервер: его разбирает и выполняет ' +
    'учебный интерпретатор подмножества C++ прямо в браузере. Компилятор и установка не нужны.</p>' +
    '<p style="margin:0 0 8px">Что есть: <code>#include</code>, <code>using namespace std;</code>, ' +
    '<code>int/long/double/float/char/bool/string/auto</code>, массивы (в том числе двумерные), ' +
    '<code>vector</code>, <code>if/else</code>, <code>for</code>, <code>while</code>, <code>do-while</code>, ' +
    'функции и рекурсия, <code>cout/cin</code>, приведение типов.</p>' +
    '<p style="margin:0">Чего нет: указателей, <code>struct/class</code>, <code>switch</code> и сторонних ' +
    'библиотек — площадка честно скажет об этом в ошибке с номером строки.</p>';

  function adapt(res) {
    if (res && res.ok) return { ok: true, output: res.output, error: null, ms: res.duration_ms };
    var msg = (res && res.error) || 'не удалось выполнить код';
    var line = res && res.line ? res.line : null;
    return { ok: false, output: res && res.output, error: { msg: msg, line: line, kind: 'Ошибка' }, ms: res && res.duration_ms };
  }

  global.PLAY_CONFIG = {
    storageKey: 'play.cpp.v1',
    stdinLabel: 'cin',
    engineLabel: 'движок: C++ в браузере · офлайн',
    cheat: CHEAT,
    note: NOTE,
    defaultCode: [
      '#include <iostream>',
      'using namespace std;',
      '',
      'int main() {',
      '    string name;',
      '    int n;',
      '    cin >> name >> n;',
      '',
      '    cout << "Привет, " << name << "!" << endl;',
      '    cout << "квадрат числа: " << n * n << endl;',
      '',
      '    for (int i = 1; i <= n; i++) {',
      '        cout << i << " x " << i << " = " << i * i << endl;',
      '    }',
      '    return 0;',
      '}'
    ].join('\n'),
    defaultStdin: 'Аня 5',

    run: function (code, stdinText) {
      return adapt(global.CppEngine.run(code, String(stdinText || '')));
    },

    examples: [
      {
        name: 'Привет, мир',
        code: [
          '#include <iostream>',
          'using namespace std;',
          '',
          'int main() {',
          '    cout << "Привет, квантум!" << endl;',
          '    cout << "C++ работает прямо в браузере" << endl;',
          '    return 0;',
          '}'
        ].join('\n'),
        stdin: ''
      },
      {
        name: 'Ввод и арифметика',
        code: [
          '#include <iostream>',
          'using namespace std;',
          '',
          'int main() {',
          '    int a, b;',
          '    cin >> a >> b;',
          '    cout << "сумма: " << a + b << endl;',
          '    cout << "разность: " << a - b << endl;',
          '    cout << "произведение: " << a * b << endl;',
          '    cout << "деление: " << a * 1.0 / b << endl;',
          '    cout << "остаток: " << a % b << endl;',
          '    return 0;',
          '}'
        ].join('\n'),
        stdin: '17 5'
      },
      {
        name: 'Циклы и таблица умножения',
        code: [
          '#include <iostream>',
          'using namespace std;',
          '',
          'int main() {',
          '    int n;',
          '    cin >> n;',
          '    for (int i = 1; i <= n; i++) {',
          '        for (int j = 1; j <= n; j++) {',
          '            cout << i * j << " ";',
          '        }',
          '        cout << endl;',
          '    }',
          '    return 0;',
          '}'
        ].join('\n'),
        stdin: '5'
      },
      {
        name: 'Массив: сумма и максимум',
        code: [
          '#include <iostream>',
          'using namespace std;',
          '',
          'int main() {',
          '    int n;',
          '    cin >> n;',
          '    int a[1000];',
          '    for (int i = 0; i < n; i++) cin >> a[i];',
          '',
          '    int sum = 0, mx = a[0];',
          '    for (int i = 0; i < n; i++) {',
          '        sum += a[i];',
          '        if (a[i] > mx) mx = a[i];',
          '    }',
          '    cout << "сумма: " << sum << endl;',
          '    cout << "максимум: " << mx << endl;',
          '    cout << "среднее: " << sum * 1.0 / n << endl;',
          '    return 0;',
          '}'
        ].join('\n'),
        stdin: '6\n7 3 9 1 4 8'
      },
      {
        name: 'vector и строки',
        code: [
          '#include <iostream>',
          '#include <vector>',
          'using namespace std;',
          '',
          'int main() {',
          '    int n;',
          '    cin >> n;',
          '    vector<int> squares;',
          '    for (int i = 1; i <= n; i++) squares.push_back(i * i);',
          '',
          '    cout << "квадраты:";',
          '    for (int i = 0; i < squares.size(); i++) cout << " " << squares[i];',
          '    cout << endl;',
          '',
          '    string s;',
          '    cin >> s;',
          '    cout << "слово " << s << " длиной " << s.size() << endl;',
          '    cout << "с конца: ";',
          '    for (int i = s.size() - 1; i >= 0; i--) cout << s[i];',
          '    cout << endl;',
          '    return 0;',
          '}'
        ].join('\n'),
        stdin: '5\nkvantum'
      },
      {
        name: 'Функции и рекурсия',
        code: [
          '#include <iostream>',
          'using namespace std;',
          '',
          'int fact(int n) {',
          '    if (n <= 1) return 1;',
          '    return n * fact(n - 1);',
          '}',
          '',
          'int gcd(int a, int b) {',
          '    if (b == 0) return a;',
          '    return gcd(b, a % b);',
          '}',
          '',
          'int main() {',
          '    int a, b;',
          '    cin >> a >> b;',
          '    cout << "факториал " << a << " = " << fact(a) << endl;',
          '    cout << "НОД(" << a << ", " << b << ") = " << gcd(a, b) << endl;',
          '    return 0;',
          '}'
        ].join('\n'),
        stdin: '10 24'
      },
      {
        name: 'Сортировка пузырьком',
        code: [
          '#include <iostream>',
          'using namespace std;',
          '',
          'int main() {',
          '    int n;',
          '    cin >> n;',
          '    int a[1000];',
          '    for (int i = 0; i < n; i++) cin >> a[i];',
          '',
          '    for (int i = 0; i < n; i++) {',
          '        for (int j = 0; j < n - 1 - i; j++) {',
          '            if (a[j] > a[j + 1]) {',
          '                int t = a[j];',
          '                a[j] = a[j + 1];',
          '                a[j + 1] = t;',
          '            }',
          '        }',
          '    }',
          '    for (int i = 0; i < n; i++) cout << a[i] << " ";',
          '    cout << endl;',
          '    return 0;',
          '}'
        ].join('\n'),
        stdin: '7\n5 2 9 1 5 6 3'
      },
      {
        name: 'Простые числа',
        code: [
          '#include <iostream>',
          'using namespace std;',
          '',
          'bool isPrime(int n) {',
          '    if (n < 2) return false;',
          '    for (int d = 2; d * d <= n; d++) {',
          '        if (n % d == 0) return false;',
          '    }',
          '    return true;',
          '}',
          '',
          'int main() {',
          '    int limit;',
          '    cin >> limit;',
          '    int count = 0;',
          '    cout << "простые до " << limit << ":";',
          '    for (int x = 2; x <= limit; x++) {',
          '        if (isPrime(x)) {',
          '            cout << " " << x;',
          '            count++;',
          '        }',
          '    }',
          '    cout << endl << "всего: " << count << endl;',
          '    return 0;',
          '}'
        ].join('\n'),
        stdin: '30'
      }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
