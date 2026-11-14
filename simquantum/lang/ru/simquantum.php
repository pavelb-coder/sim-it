<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Русские строки плагина «Тренажёр IT-квантума».
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['modulename'] = 'Тренажёр IT-квантума';
$string['modulenameplural'] = 'Тренажёры IT-квантума';
$string['modulename_help'] = 'Элемент курса встраивает в Moodle браузерный тренажёр IT-квантума: Python-класс, C++-класс, терминал Linux, симулятор сети, веб-студию, SQL, кибербезопасность, нейросети или свободную песочницу кода.

Тренажёр работает целиком в браузере ученика: свой интерпретатор Python и C++, виртуальная файловая система, модель сети и SQL-движок написаны на JavaScript. Ничего не нужно устанавливать, интернет на машине ученика не требуется — файлы тренажёров лежат внутри плагина и отдаются самим Moodle.

Преподаватель выбирает тренажёр и высоту рабочей области; описание элемента курса показывается над тренажёром.';
$string['pluginname'] = 'Тренажёр IT-квантума';
$string['pluginadministration'] = 'Управление тренажёром IT-квантума';
$string['simquantum:addinstance'] = 'Добавить тренажёр IT-квантума';
$string['simquantum:view'] = 'Просматривать тренажёр IT-квантума';

$string['trainer'] = 'Тренажёр';
$string['trainer_help'] = 'Список тренажёров линейки. Внутри каждого — теория, задачи с автопроверкой и рабочая область; «песочницы» — свободные площадки для своего кода без задач.

Если нужного тренажёра нет в списке, администратор сайта может включить его в разделе «Администрирование → Плагины → Элементы курса → Тренажёр IT-квантума».';
$string['trainerinfo'] = 'Тренажёр работает офлайн: все файлы уже внутри плагина, прогресс ученика сохраняется в его браузере.';
$string['trainererror'] = 'Выберите тренажёр из списка.';
$string['trainermissing'] = 'Файл выбранного тренажёра отсутствует в плагине. Попросите администратора обновить плагин или выберите другой тренажёр в настройках элемента курса.';
$string['height'] = 'Высота рабочей области, px';
$string['height_help'] = 'Высота рамки с тренажёром на странице курса, в пикселях. По умолчанию 900. Допустимо от 400 до 3000; на телефоне рамка подстраивается под ширину экрана, а тренажёр можно открыть на всю страницу отдельной ссылкой.';
$string['heighterror'] = 'Укажите высоту числом от {$a->min} до {$a->max} пикселей.';
$string['taskscount'] = '{$a} задач с автопроверкой';
$string['freestyle'] = 'свободный код, без задач';
$string['opennewtab'] = 'Открыть тренажёр на всю страницу';
$string['openactivity'] = 'Открыть тренажёр';
$string['noinstances'] = 'В этом курсе пока нет тренажёров IT-квантума.';
$string['description'] = 'Описание';
$string['eventcoursemoduleviewed'] = 'Тренажёр IT-квантума просмотрен';

$string['trainer_python'] = 'Python-класс';
$string['trainer_python_desc'] = 'свой интерпретатор Python в браузере, 26 тем от print до CSV';
$string['trainer_cpp'] = 'C++-класс';
$string['trainer_cpp_desc'] = 'учебное подмножество C++: типы, циклы, массивы, vector, функции, ДП';
$string['trainer_terminal'] = 'Терминал Linux';
$string['trainer_terminal_desc'] = 'виртуальная файловая система, 20+ команд, шаблоны, права, перенаправления';
$string['trainer_network'] = 'Симулятор сети';
$string['trainer_network_desc'] = 'модель IPv4: подсети, маски, шлюзы, таблицы маршрутов, настоящий ping';
$string['trainer_web'] = 'Веб-студия';
$string['trainer_web_desc'] = 'HTML и CSS с живым превью и проверкой вёрстки';
$string['trainer_sql'] = 'SQL-тренажёр';
$string['trainer_sql_desc'] = 'настоящий движок запросов: SELECT, WHERE, LIKE, ORDER BY, LIMIT, агрегаты';
$string['trainer_security'] = 'Кибербезопасность';
$string['trainer_security_desc'] = 'base64, шифр Цезаря, хеши, аудит HTTP-заголовков, code review';
$string['trainer_ai'] = 'Нейросеть изнутри';
$string['trainer_ai_desc'] = 'перцептрон обучается на глазах: веса, потери, AND/OR/XOR, реальные данные';
$string['trainer_pyplay'] = 'Python-песочница';
$string['trainer_pyplay_desc'] = 'свободная площадка: любой код, тестовый ввод, вывод и ошибки';
$string['trainer_cppplay'] = 'C++-песочница';
$string['trainer_cppplay_desc'] = 'свободная площадка: любой код на учебном C++, cin и cout';

$string['enabledtrainers'] = 'Тренажёры, доступные преподавателям';
$string['enabledtrainers_desc'] = 'Отметьте тренажёры, которые можно добавлять в курсы. Остальные не появятся в списке выбора у преподавателя.';
$string['settingheading'] = 'Тренажёры IT-квантума';
$string['assetsheading'] = 'Файлы тренажёров в плагине';
$string['assetsheading_desc'] = 'Файлы лежат в папке assets/ плагина. Чтобы обновить тренажёры до новой версии, замените файлы и очистите кеш Moodle.';

$string['privacy:metadata'] = 'Плагин не хранит персональные данные: прогресс тренажёра остаётся в браузере ученика (localStorage), в Moodle попадают только стандартные записи о просмотре элемента курса.';
