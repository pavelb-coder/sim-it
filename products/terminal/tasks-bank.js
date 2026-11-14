/* ==========================================================================
   Терминал Linux — банк задач: mv, cp с шаблонами, head/tail, grep, wc,
   mkdir -p, chmod, rm -r, дописывание >>. Проверки смотрят на файлы,
   а не на введённые команды: решить можно по-разному.
   ========================================================================== */
(function (global) {
  'use strict';

  function api() { return global.TermAPI; }
  function norm(s) { return String(s || '').replace(/\r/g, '').trim(); }
  function lower(s) { return norm(s).toLowerCase(); }
  function has(p) { return !!api().lookup(p); }
  function content(p) { return lower(api().read(p)); }
  function mode(p) { return api().mode(p); }
  function childNames(dir) {
    var n = api().lookup(dir);
    if (!n || n.type !== 'dir') return [];
    return Object.keys(n.children || {});
  }

  var bank = [
    {
      id: 't9', level: 'легко',
      title: 'Переместить файл',
      subtitle: 'mv — двигает, а не копирует',
      theory: '<p><code>mv</code> перемещает файл: в старом месте его больше нет. <code>cp</code>, наоборот, оставляет копию и создаёт вторую.</p>' +
        '<p>Если второй аргумент — существующая папка, файл кладут внутрь неё с тем же именем. Если указать новое имя — это ещё и переименование.</p>',
      prompt: 'Убери временный файл из рабочей папки: перемести <code>данные/старый.tmp</code> в <code>архив</code> (имя файла не меняй).',
      examples: [{ label: 'подсказка по командам', text: 'mv откуда куда · ls данные · ls архив' }],
      hint: 'mv данные/старый.tmp архив',
      solution: ['mv данные/старый.tmp архив'],
      checks: [
        { label: 'файл лежит в архиве', fn: function () { return has('~/архив/старый.tmp'); } },
        { label: 'из папки данные файл исчез', fn: function () { return !has('~/данные/старый.tmp'); } }
      ]
    },
    {
      id: 't10', level: 'легко',
      title: 'Первые строки журнала',
      subtitle: 'head -n и перенаправление',
      theory: '<p><code>head -n 3 файл</code> показывает первые три строки, <code>tail -n 3</code> — последние три.</p>' +
        '<p>Добавив <code>&gt; файл</code>, ты сохраняешь этот вывод в новый файл. Так делают короткие выжимки из больших логов.</p>',
      prompt: 'Сохрани <b>первые три строки</b> файла <code>данные/журнал.txt</code> в файл <code>начало.txt</code> в домашней папке.',
      examples: [{ label: 'подсказка', text: 'head -n 3 данные/журнал.txt > начало.txt' }],
      hint: 'Сначала команда, потом >, потом имя файла.',
      solution: ['head -n 3 данные/журнал.txt > начало.txt'],
      checks: [
        { label: 'файл начало.txt создан', fn: function () { return has('~/начало.txt'); } },
        {
          label: 'в нём ровно три строки журнала',
          fn: function () {
            var t = norm(api().read('~/начало.txt'));
            return t.split('\n').length === 3 && t.indexOf('пн') >= 0 && t.indexOf('ср') >= 0 && t.indexOf('чт') < 0;
          },
          note: 'ожидаются строки пн, вт, ср — и ничего больше'
        }
      ]
    },
    {
      id: 't11', level: 'легко',
      title: 'Хвост журнала',
      subtitle: 'tail -n',
      theory: '<p><code>tail</code> удобнее всего для логов: самое свежее всегда в конце файла.</p>' +
        '<p>Флаг можно писать по-разному: <code>tail -n 2 файл</code> и <code>tail -2 файл</code> работают одинаково.</p>',
      prompt: 'Сохрани <b>последние две строки</b> <code>данные/журнал.txt</code> в файл <code>конец.txt</code>.',
      examples: [{ label: 'подсказка', text: 'tail -n 2 данные/журнал.txt > конец.txt' }],
      hint: 'tail берёт конец файла, а > записывает результат.',
      solution: ['tail -n 2 данные/журнал.txt > конец.txt'],
      checks: [
        { label: 'файл конец.txt создан', fn: function () { return has('~/конец.txt'); } },
        {
          label: 'в нём две последние строки (сб и вс)',
          fn: function () {
            var t = norm(api().read('~/конец.txt'));
            return t.split('\n').length === 2 && t.indexOf('сб') >= 0 && t.indexOf('вс') >= 0;
          },
          note: 'ожидаются строки про субботу и воскресенье'
        }
      ]
    },
    {
      id: 't12', level: 'средне',
      title: 'Выжимка по слову',
      subtitle: 'grep и запись результата',
      theory: '<p><code>grep слово файл</code> печатает только строки, где это слово встречается. Поиск нечувствителен к регистру.</p>' +
        '<p>Результат можно сохранить: <code>grep слово файл &gt; выжимка.txt</code>. Так из большого файла получают маленький отчёт.</p>',
      prompt: 'Найди в <code>данные/журнал.txt</code> строки со словом <code>проект</code> и сохрани их в файл <code>проекты.txt</code>.',
      examples: [{ label: 'подсказка', text: 'grep проект данные/журнал.txt > проекты.txt' }],
      hint: 'grep слово файл > куда.',
      solution: ['grep проект данные/журнал.txt > проекты.txt'],
      checks: [
        { label: 'файл проекты.txt создан', fn: function () { return has('~/проекты.txt'); } },
        {
          label: 'в нём строка про проект и нет других строк',
          fn: function () {
            var t = norm(api().read('~/проекты.txt'));
            return t.split('\n').length === 1 && t.toLowerCase().indexOf('проект') >= 0;
          }
        }
      ]
    },
    {
      id: 't13', level: 'средне',
      title: 'Сводка из двух файлов',
      subtitle: 'cat с несколькими аргументами',
      theory: '<p><code>cat</code> умеет печатать сразу несколько файлов подряд — в том порядке, в котором ты их перечислил.</p>' +
        '<p>Вместе с <code>&gt;</code> это простой способ склеить два текста в один. Порядок аргументов задаёт порядок частей.</p>',
      prompt: 'Склей <code>данные/отчёт.txt</code> и <code>данные/журнал.txt</code> в один файл <code>сводка.txt</code> (сначала отчёт, потом журнал).',
      examples: [{ label: 'подсказка', text: 'cat файл1 файл2 > сводка.txt' }],
      hint: 'cat данные/отчёт.txt данные/журнал.txt > сводка.txt',
      solution: ['cat данные/отчёт.txt данные/журнал.txt > сводка.txt'],
      checks: [
        { label: 'файл сводка.txt создан', fn: function () { return has('~/сводка.txt'); } },
        {
          label: 'в нём есть и отчёт, и журнал, отчёт выше',
          fn: function () {
            var t = norm(api().read('~/сводка.txt'));
            var a = t.indexOf('отчёт за месяц');
            var b = t.indexOf('пн: занятие');
            return a >= 0 && b >= 0 && a < b;
          }
        }
      ]
    },
    {
      id: 't14', level: 'средне',
      title: 'Собрать отчёты',
      subtitle: 'cp с шаблоном',
      theory: '<p>Шаблон <code>*</code> разворачивается в список подходящих имён. <code>cp данные/*.txt архив</code> скопирует все txt-файлы в папку архива.</p>' +
        '<p>Одна команда вместо трёх — и никаких опечаток в именах.</p>',
      prompt: 'Скопируй <b>все файлы .txt</b> из папки <code>данные</code> в папку <code>архив</code> (исходные файлы должны остаться на месте).',
      examples: [{ label: 'подсказка', text: 'cp данные/*.txt архив' }],
      hint: 'Шаблон пишется прямо в имени файла: данные/*.txt',
      solution: ['cp данные/*.txt архив'],
      checks: [
        {
          label: 'в архиве три txt-файла',
          fn: function () {
            var names = childNames('~/архив');
            return ['отчёт.txt', 'журнал.txt', 'секрет.txt'].every(function (n) { return names.indexOf(n) >= 0; });
          }
        },
        { label: 'исходные файлы остались в данных', fn: function () { return has('~/данные/отчёт.txt') && has('~/данные/журнал.txt'); } }
      ]
    },
    {
      id: 't15', level: 'легко',
      title: 'Работа внутри папки',
      subtitle: 'cd и относительные пути',
      theory: '<p><code>cd папка</code> меняет текущий каталог. После этого относительные пути считаются от него, а не от домашней папки.</p>' +
        '<p>Обратно домой возвращает <code>cd</code> без аргументов или <code>cd ~</code>.</p>',
      prompt: 'Перейди в папку <code>данные</code> и создай там пустой файл <code>черновик.txt</code>.',
      examples: [{ label: 'подсказка', text: 'cd данные · touch черновик.txt' }],
      hint: 'Две команды: cd данные и touch черновик.txt.',
      solution: ['cd данные', 'touch черновик.txt'],
      checks: [
        { label: 'файл появился внутри папки данные', fn: function () { return has('~/данные/черновик.txt'); } },
        { label: 'в домашней папке такого файла нет', fn: function () { return !has('~/черновик.txt'); } }
      ]
    },
    {
      id: 't16', level: 'средне',
      title: 'Личная папка',
      subtitle: 'chmod 700',
      theory: '<p>Режим <code>700</code> — полный доступ владельцу и никакого остальным. Для папки это значит: войти и посмотреть содержимое может только владелец.</p>' +
        '<p>Режим <code>755</code> разрешает всем читать и входить — это удобно для общих папок, но не для личных файлов.</p>',
      prompt: 'Создай папку <code>секреты</code> и закрой её от посторонних: права <code>700</code>.',
      examples: [{ label: 'подсказка', text: 'mkdir секреты · chmod 700 секреты · ls -l' }],
      hint: 'Сначала mkdir, потом chmod 700.',
      solution: ['mkdir секреты', 'chmod 700 секреты'],
      checks: [
        { label: 'папка секреты создана', fn: function () { return has('~/секреты'); } },
        { label: 'у папки права 700', fn: function () { return mode('~/секреты') === '700'; }, note: 'в ls -l должно быть drwx------' }
      ]
    },
    {
      id: 't17', level: 'средне',
      title: 'Файл, который можно запускать',
      subtitle: 'chmod 755',
      theory: '<p>Скрипт — обычный текстовый файл. Чтобы его можно было запустить, нужен бит исполнения: <code>chmod 755</code>.</p>' +
        '<p>Разложим 755: владелец — 7 (читать, писать, запускать), группа — 5 (читать, запускать), остальные — 5.</p>',
      prompt: 'Создай файл <code>run.sh</code> и сделай его исполняемым: права <code>755</code>.',
      examples: [{ label: 'подсказка', text: 'touch run.sh · chmod 755 run.sh · ls -l run.sh' }],
      hint: 'touch создаёт файл, chmod 755 даёт права.',
      solution: ['touch run.sh', 'chmod 755 run.sh'],
      checks: [
        { label: 'файл run.sh есть', fn: function () { return has('~/run.sh'); } },
        { label: 'у него права 755', fn: function () { return mode('~/run.sh') === '755'; }, note: 'в ls -l ожидается -rwxr-xr-x' }
      ]
    },
    {
      id: 't18', level: 'легко',
      title: 'Удалить папку целиком',
      subtitle: 'rm -r',
      theory: '<p><code>rm</code> не удаляет папки без флага <code>-r</code> (recursive — «со всем содержимым»).</p>' +
        '<p>Корзины в терминале нет: удалённое не вернуть. Поэтому перед <code>rm -r</code> полезно сделать <code>ls</code> и убедиться, что путь верный.</p>',
      prompt: 'Папка <code>архив</code> больше не нужна: удали её целиком вместе с содержимым.',
      examples: [{ label: 'подсказка', text: 'ls архив · rm -r архив' }],
      hint: 'rm -r архив',
      solution: ['rm -r архив'],
      checks: [
        { label: 'папки архив больше нет', fn: function () { return !has('~/архив'); } },
        { label: 'остальные папки на месте', fn: function () { return has('~/данные') && has('~/мусор'); } }
      ]
    },
    {
      id: 't19', level: 'средне',
      title: 'Дописать в конец',
      subtitle: '>>',
      theory: '<p>Один знак <code>&gt;</code> перезаписывает файл, два — <code>&gt;&gt;</code> — дописывают в конец.</p>' +
        '<p>Это различие спасает данные: случайный <code>&gt;</code> вместо <code>&gt;&gt;</code> стирает всё, что было в файле.</p>',
      prompt: 'Допиши в файл <code>читай.txt</code> новую строку <code>это моя заметка</code>, сохранив то, что там уже есть.',
      examples: [{ label: 'подсказка', text: 'echo "это моя заметка" >> читай.txt · cat читай.txt' }],
      hint: 'Нужны два знака: >>',
      solution: ['echo "это моя заметка" >> читай.txt'],
      checks: [
        {
          label: 'новая строка появилась в файле',
          fn: function () { return content('~/читай.txt').indexOf('это моя заметка') >= 0; }
        },
        {
          label: 'старое содержимое сохранилось',
          fn: function () { return content('~/читай.txt').indexOf('добро пожаловать') >= 0; },
          note: 'если старый текст пропал — значит использован > вместо >>'
        }
      ]
    },
    {
      id: 't20', level: 'средне',
      title: 'План на две строки',
      subtitle: 'создать и дописать',
      theory: '<p>Файл из нескольких строк собирают так: первая строка через <code>&gt;</code>, остальные через <code>&gt;&gt;</code>.</p>' +
        '<p>Так же работают с конфигами и списками задач — только в реальных проектах это делает скрипт.</p>',
      prompt: 'Создай файл <code>план.txt</code> с двумя строками: <code>1. повторить команды</code> и <code>2. сдать задачу</code>.',
      examples: [{ label: 'подсказка', text: 'echo "1. повторить команды" > план.txt · echo "2. сдать задачу" >> план.txt' }],
      hint: 'Сначала > для первой строки, потом >> для второй.',
      solution: ['echo "1. повторить команды" > план.txt', 'echo "2. сдать задачу" >> план.txt'],
      checks: [
        { label: 'файл план.txt создан', fn: function () { return has('~/план.txt'); } },
        {
          label: 'в нём ровно две нужные строки по порядку',
          fn: function () {
            var lines = norm(api().read('~/план.txt')).split('\n');
            return lines.length === 2 && lines[0].indexOf('1.') === 0 && lines[1].indexOf('2.') === 0;
          }
        }
      ]
    },
    {
      id: 't21', level: 'средне',
      title: 'Скрытый файл',
      subtitle: 'точка в начале имени',
      theory: '<p>Файлы, имя которых начинается с точки, считаются скрытыми: обычный <code>ls</code> их не показывает.</p>' +
        '<p>Так хранят настройки. Список всех файлов, включая скрытые, даёт <code>ls -a</code> (в этом тренажёре флаг не реализован, но в настоящем Linux — да).</p>',
      prompt: 'Переименуй <code>данные/секрет.txt</code> в <code>данные/.секрет.txt</code> — сделай файл скрытым.',
      examples: [{ label: 'подсказка', text: 'mv данные/секрет.txt данные/.секрет.txt' }],
      hint: 'Имя меняется командой mv: тот же путь, но с точкой в начале имени.',
      solution: ['mv данные/секрет.txt данные/.секрет.txt'],
      checks: [
        { label: 'появился скрытый файл .секрет.txt', fn: function () { return has('~/данные/.секрет.txt'); } },
        { label: 'старого имени больше нет', fn: function () { return !has('~/данные/секрет.txt'); } }
      ]
    },
    {
      id: 't22', level: 'средне',
      title: 'Собрать временные файлы',
      subtitle: 'cp с шаблоном *.tmp',
      theory: '<p>Шаблон работает в любой команде, которая принимает имена файлов: в <code>ls</code>, <code>cp</code>, <code>rm</code>, <code>cat</code>.</p>' +
        '<p>Проверить, что именно попадёт под шаблон, можно заранее: набери <code>ls мусор/*.tmp</code>.</p>',
      prompt: 'Собери все временные файлы <code>.tmp</code> из папки <code>мусор</code> в папку <code>архив</code>. Файл <code>важное.txt</code> не копируй.',
      examples: [{ label: 'подсказка', text: 'ls мусор/*.tmp · cp мусор/*.tmp архив' }],
      hint: 'Шаблон *.tmp заденет только временные файлы.',
      solution: ['cp мусор/*.tmp архив'],
      checks: [
        {
          label: 'в архиве оба временных файла',
          fn: function () {
            var names = childNames('~/архив');
            return names.indexOf('a.tmp') >= 0 && names.indexOf('b.tmp') >= 0;
          }
        },
        { label: 'важное.txt в архив не попало', fn: function () { return childNames('~/архив').indexOf('важное.txt') < 0; } }
      ]
    },
    {
      id: 't23', level: 'сложно',
      title: 'Уборка в двух папках',
      subtitle: 'rm с шаблоном в разных местах',
      theory: '<p>Шаблон срабатывает в пределах одного каталога. Чтобы убрать мусор в двух разных папках, нужны две команды — или одна команда с двумя шаблонами.</p>' +
        '<p>Проверка «а не удалил ли лишнего» — обязательная привычка при работе с <code>rm</code>.</p>',
      prompt: 'Удали все <code>.tmp</code> файлы и в папке <code>мусор</code>, и в папке <code>данные</code>. Файл <code>важное.txt</code> не трогай.',
      examples: [{ label: 'подсказка', text: 'rm мусор/*.tmp данные/*.tmp · ls мусор данные' }],
      hint: 'Одна команда rm может принять несколько шаблонов.',
      solution: ['rm мусор/*.tmp данные/*.tmp'],
      checks: [
        {
          label: 'во временных папках не осталось .tmp',
          fn: function () {
            var a = childNames('~/мусор'), b = childNames('~/данные');
            return a.indexOf('a.tmp') < 0 && a.indexOf('b.tmp') < 0 && b.indexOf('старый.tmp') < 0;
          }
        },
        { label: 'важное.txt и остальные файлы целы', fn: function () { return has('~/мусор/важное.txt') && has('~/данные/журнал.txt'); } }
      ]
    },
    {
      id: 't24', level: 'средне',
      title: 'Паспорт рабочей папки',
      subtitle: 'pwd и whoami в файл',
      theory: '<p><code>pwd</code> печатает текущий путь, <code>whoami</code> — имя пользователя. Обе команды полезны в скриптах: результат можно записать в файл.</p>' +
        '<p>Комбинация <code>&gt;</code> и <code>&gt;&gt;</code> собирает многострочный отчёт из нескольких команд.</p>',
      prompt: 'Собери файл <code>инфо.txt</code>: первая строка — путь к текущей папке, вторая — имя пользователя.',
      examples: [{ label: 'подсказка', text: 'pwd > инфо.txt · whoami >> инфо.txt' }],
      hint: 'Две команды: сначала pwd с >, потом whoami с >>.',
      solution: ['pwd > инфо.txt', 'whoami >> инфо.txt'],
      checks: [
        { label: 'файл инфо.txt создан', fn: function () { return has('~/инфо.txt'); } },
        {
          label: 'в нём путь /home/student и имя student',
          fn: function () {
            var t = content('~/инфо.txt');
            return t.indexOf('/home/student') >= 0 && t.indexOf('student') >= 0 && t.split('\n').length === 2;
          }
        }
      ]
    },
    {
      id: 't25', level: 'сложно',
      title: 'Поиск по всему дому',
      subtitle: 'grep -r и отчёт',
      theory: '<p><code>grep -r слово папка</code> ищет рекурсивно: заходит во все вложенные папки и показывает, где слово нашлось.</p>' +
        '<p>Так ищут настройки в проектах: «в каком файле упоминается этот ключ». Результат удобно сохранить в файл-отчёт.</p>',
      prompt: 'Найди во всей домашней папке строки со словом <code>занятие</code> и сохрани результат в <code>найдено.txt</code>.',
      examples: [{ label: 'подсказка', text: 'grep -r занятие . > найдено.txt' }],
      hint: 'Точка означает «текущая папка», флаг -r — «искать везде внутри».',
      solution: ['grep -r занятие . > найдено.txt'],
      checks: [
        { label: 'файл найдено.txt создан', fn: function () { return has('~/найдено.txt'); } },
        {
          label: 'в нём не меньше пяти найденных строк',
          fn: function () {
            var t = norm(api().read('~/найдено.txt'));
            return t.split('\n').filter(function (l) { return l.toLowerCase().indexOf('занятие') >= 0; }).length >= 5;
          },
          note: 'в журнале пять дней с занятиями'
        }
      ]
    }
  ];

  global.TERM_TASKS = (global.TERM_TASKS || []).concat(bank);
})(typeof window !== 'undefined' ? window : globalThis);
