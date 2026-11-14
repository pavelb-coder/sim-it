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
 * Проверка плагина mod_simquantum без установки Moodle.
 *
 * Создаёт во временной папке мини-«Moodle» (заглушка config.php со нужными
 * функциями и классами), подкладывает туда плагин и выполняет сценарии:
 *   * каталог: список тренажёров, поиск файла, защита от подстановки пути;
 *   * content.php: отдаёт ровно байты файла, 404 при неизвестном тренажёре,
 *     500 без права просмотра;
 *   * lib.php: добавление, обновление, удаление экземпляра, чистка значений.
 *
 * Запуск:  php tests/harness/run.php
 *
 * Это не замена тестам Moodle (PHPUnit), а быстрая проверка логики и путей
 * там, где полноценный сайт поднимать нецелесообразно.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('SIMQUANTUM_HARNESS', true);

$pluginroot = dirname(__DIR__, 2);
$plugin = $pluginroot . '/simquantum';

/**
 * Мини-Moodle: заглушки того, что нужно плагину (лежат в moodle_stub.php).
 */
function simquantum_harness_stub(): string {
    return file_get_contents(__DIR__ . '/moodle_stub.php');
}

/**
 * Записать во временную папку заглушку Moodle, фикстуру и ссылку на плагин.
 *
 * @param string $plugin абсолютный путь к папке simquantum
 * @return string путь к фальшивому корню Moodle
 */
function simquantum_harness_setup(string $plugin): string {
    $docroot = sys_get_temp_dir() . '/simquantum-harness-' . getmypid() . '/moodle';
    if (!is_dir($docroot . '/mod')) {
        mkdir($docroot . '/mod', 0777, true);
    }
    file_put_contents($docroot . '/config.php', simquantum_harness_stub());

    // Плагин копируется, а не линкуется: content.php считает пути от своего
    // реального расположения (__DIR__), а симлинк увёл бы его из «Moodle».
    $target = $docroot . '/mod/simquantum';
    if (!is_dir($target)) {
        $copied = shell_exec('cp -a ' . escapeshellarg($plugin) . ' ' . escapeshellarg($target) . ' 2>&1');
        if (!is_dir($target)) {
            simquantum_harness_copy_tree($plugin, $target);
        }
    }
    return $docroot;
}

/**
 * Копирование дерева файлов на случай, если cp недоступен.
 *
 * @param string $from источник
 * @param string $to назначение
 */
function simquantum_harness_copy_tree(string $from, string $to): void {
    @mkdir($to, 0777, true);
    foreach (scandir($from) as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $source = $from . '/' . $item;
        $dest = $to . '/' . $item;
        if (is_dir($source)) {
            simquantum_harness_copy_tree($source, $dest);
        } else {
            copy($source, $dest);
        }
    }
}

/**
 * Сценарии, которые выполняются внутри фальшивого Moodle.
 *
 * @param string $scenario имя сценария
 * @param string $docroot корень фальшивого Moodle
 */
function simquantum_harness_scenario(string $scenario, string $docroot): void {
    switch ($scenario) {
        case 'catalog':
            require($docroot . '/config.php');
            $trainers = \mod_simquantum\local\catalog::get_trainers();
            $report = ['count' => count($trainers), 'slugs' => array_keys($trainers)];
            $report['pythonpath'] = \mod_simquantum\local\catalog::asset_path('python');
            $report['traversal'] = \mod_simquantum\local\catalog::asset_path('../../config.php');
            $report['unknown'] = \mod_simquantum\local\catalog::asset_path('no-such-trainer');
            $report['clamp'] = [
                'low' => \mod_simquantum\local\catalog::clamp_height(100),
                'ok' => \mod_simquantum\local\catalog::clamp_height(1200),
                'high' => \mod_simquantum\local\catalog::clamp_height(99999),
                'garbage' => \mod_simquantum\local\catalog::clamp_height('abc'),
            ];
            $report['default'] = \mod_simquantum\local\catalog::default_trainer();
            echo json_encode($report, JSON_UNESCAPED_UNICODE);
            break;

        case 'lib':
            require($docroot . '/config.php');
            require($docroot . '/mod/simquantum/lib.php');
            global $DB;

            $added = simquantum_add_instance((object)[
                'course' => 1,
                'name' => 'Первый',
                'trainer' => 'cpp',
                'height' => 1500,
            ]);
            $huge = simquantum_add_instance((object)[
                'course' => 1,
                'name' => 'Огромная рамка',
                'trainer' => 'python',
                'height' => 99999,
            ]);
            $bad = simquantum_add_instance((object)[
                'course' => 1,
                'name' => 'Плохой код',
                'trainer' => '../../config',
                'height' => 'abc',
            ]);
            $upd = simquantum_update_instance((object)[
                'instance' => 7,
                'course' => 1,
                'name' => 'Обновлённый',
                'trainer' => 'sql',
                'height' => 800,
            ]);
            $del = simquantum_delete_instance(10);

            $report = [
                'added_id' => $added,
                'inserted' => $DB->inserted,
                'updated' => $DB->updated,
                'deleted' => $DB->deleted,
                'update_result' => $upd,
                'delete_result' => $del,
                'supports' => [
                    'intro' => simquantum_supports(FEATURE_MOD_INTRO),
                    'purpose' => simquantum_supports(FEATURE_MOD_PURPOSE),
                    'grade' => simquantum_supports(FEATURE_GRADE_HAS_GRADE),
                    'unknown' => simquantum_supports('some_unknown_feature'),
                ],
            ];
            echo json_encode($report, JSON_UNESCAPED_UNICODE);
            break;

        default:
            fwrite(STDERR, 'unknown scenario: ' . $scenario);
            exit(2);
    }
}

/* ---------------------------------------------------------------- CLI ---- */

if (PHP_SAPI === 'cli' && isset($argv[1]) && $argv[1] === '--scenario') {
    $docroot = simquantum_harness_setup(dirname(__DIR__, 2) . '/simquantum');
    // Путь к плагину передаётся снаружи, чтобы работал симлинк во временной папке.
    if (isset($argv[3])) {
        $docroot = $argv[3];
    }
    simquantum_harness_scenario($argv[2], $docroot);
    exit(0);
}

/* ------------------------------------------------------------- раннер ---- */

$fails = 0;
$passes = 0;

/**
 * Проверка одного утверждения.
 *
 * @param bool $condition условие
 * @param string $label что проверяем
 * @param string $detail подробности при провале
 */
function simquantum_harness_check(bool $condition, string $label, $detail = ''): void {
    $detail = is_scalar($detail) ? (string)$detail : json_encode($detail, JSON_UNESCAPED_UNICODE);
    global $fails, $passes;
    if ($condition) {
        $passes++;
        echo "  ok   {$label}\n";
    } else {
        $fails++;
        echo '  ПРОВАЛ ' . $label . ($detail !== '' ? ' — ' . $detail : '') . "\n";
    }
}

/**
 * Запустить сценарий в отдельном процессе и вернуть разобранный JSON.
 *
 * @param string $scenario имя сценария
 * @param string $docroot корень фальшивого Moodle
 * @param array $fixture фикстура
 * @return array
 */
function simquantum_harness_run(string $scenario, string $docroot, array $fixture): array {
    file_put_contents($docroot . '/fixture.json', json_encode($fixture));
    $cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__FILE__) .
        ' --scenario ' . escapeshellarg($scenario) . ' ' . escapeshellarg($docroot) . ' 2>&1';
    $output = shell_exec($cmd);
    $data = json_decode((string)$output, true);
    if ($data === null) {
        return ['__error' => trim((string)$output)];
    }
    return $data;
}

/**
 * HTTP-запрос к собранному фальшивому сайту.
 *
 * @param string $url адрес
 * @return array [код, тело, заголовки]
 */
function simquantum_harness_http(string $url): array {
    $context = stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 10]]);
    $body = @file_get_contents($url, false, $context);
    $status = 0;
    $headers = [];
    foreach ($http_response_header ?? [] as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d+)#', $line, $m)) {
            $status = (int)$m[1];
        } else if (strpos($line, ':') !== false) {
            [$name, $value] = explode(':', $line, 2);
            $headers[strtolower(trim($name))] = trim($value);
        }
    }
    return [$status, (string)$body, $headers];
}

echo "проверка плагина mod_simquantum без Moodle\n\n";

$docroot = simquantum_harness_setup($plugin);

echo "== Каталог тренажёров ==\n";
$cat = simquantum_harness_run('catalog', $docroot, ['trainer' => 'python']);
if (isset($cat['__error'])) {
    simquantum_harness_check(false, 'сценарий каталога выполняется', $cat['__error']);
} else {
    simquantum_harness_check($cat['count'] === 10, 'в каталоге 10 тренажёров', (string)$cat['count']);
    simquantum_harness_check(in_array('pyplay', $cat['slugs'], true), 'песочницы в каталоге есть');
    simquantum_harness_check(is_string($cat['pythonpath']) && is_file($cat['pythonpath']), 'файл Python-класса найден');
    simquantum_harness_check($cat['traversal'] === null, 'подстановка ../../config.php невозможна');
    simquantum_harness_check($cat['unknown'] === null, 'неизвестный код тренажёра даёт null');
    simquantum_harness_check($cat['clamp']['low'] === 900, 'слишком маленькая высота -> 900', (string)$cat['clamp']['low']);
    simquantum_harness_check($cat['clamp']['ok'] === 1200, 'нормальная высота сохраняется', (string)$cat['clamp']['ok']);
    simquantum_harness_check($cat['clamp']['high'] === 3000, 'высота ограничена 3000', (string)$cat['clamp']['high']);
    simquantum_harness_check($cat['clamp']['garbage'] === 900, 'мусор в высоте -> 900', (string)$cat['clamp']['garbage']);
    simquantum_harness_check($cat['default'] === 'python', 'тренажёр по умолчанию — python', (string)$cat['default']);

    $disabled = simquantum_harness_run('catalog', $docroot, ['trainer' => 'python', 'enabledtrainers' => 'sql,ai']);
    simquantum_harness_check(($disabled['slugs'] ?? []) === ['sql', 'ai'], 'настройка enabledtrainers ограничивает список',
        json_encode($disabled['slugs'] ?? $disabled, JSON_UNESCAPED_UNICODE));
}

echo "\n== lib.php: создание, обновление, удаление ==\n";
$lib = simquantum_harness_run('lib', $docroot, ['trainer' => 'python']);
if (isset($lib['__error'])) {
    simquantum_harness_check(false, 'сценарий lib выполняется', $lib['__error']);
} else {
    $ins = $lib['inserted'];
    simquantum_harness_check($lib['added_id'] === 1, 'add_instance возвращает id', (string)$lib['added_id']);
    simquantum_harness_check(count($ins) === 3, 'вставлено 3 записи', (string)count($ins));
    simquantum_harness_check($ins[0][1]['trainer'] === 'cpp' && $ins[0][1]['height'] === 1500, 'код и высота сохраняются');
    simquantum_harness_check($ins[1][1]['height'] === 3000, 'высота 99999 обрезана до 3000', (string)$ins[1][1]['height']);
    simquantum_harness_check($ins[2][1]['trainer'] === 'python', 'недопустимый код заменён на python', $ins[2][1]['trainer']);
    simquantum_harness_check($ins[2][1]['height'] === 900, 'мусорная высота заменена на 900', (string)$ins[2][1]['height']);
    simquantum_harness_check($lib['updated'][0][1]['id'] === 7, 'update_instance берёт id из instance');
    simquantum_harness_check($lib['updated'][0][1]['trainer'] === 'sql', 'update_instance сохраняет код тренажёра');
    foreach ($ins as $row) {
        simquantum_harness_check(!empty($row[1]['timecreated']) && !empty($row[1]['timemodified']),
            'время создания и изменения заполнено');
    }
    simquantum_harness_check($lib['delete_result'] === true, 'delete_instance возвращает true');
    simquantum_harness_check($lib['deleted'][0][1] === ['id' => 10], 'delete_instance удаляет запись по id');
    simquantum_harness_check($lib['supports']['intro'] === true, 'поддерживается описание');
    simquantum_harness_check($lib['supports']['purpose'] === 'interactivecontent', 'назначение элемента курса задано',
        (string)$lib['supports']['purpose']);
    simquantum_harness_check($lib['supports']['grade'] === false, 'оценок плагин не выставляет');
    simquantum_harness_check($lib['supports']['unknown'] === null, 'неизвестная возможность -> null');
}

echo "\n== content.php по HTTP ==\n";
$port = 18000 + (getmypid() % 1000);
$server = sprintf('%s -S 127.0.0.1:%d -t %s', escapeshellarg(PHP_BINARY), $port, escapeshellarg($docroot));
$handle = proc_open($server, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes);
usleep(700000);

$url = "http://127.0.0.1:{$port}/mod/simquantum/content.php?id=1";

file_put_contents($docroot . '/fixture.json', json_encode(['trainer' => 'python']));
[$status, $body, $headers] = simquantum_harness_http($url);
$asset = (string)file_get_contents($plugin . '/assets/python.html');
simquantum_harness_check($status === 200, 'валидный запрос: HTTP 200', (string)$status);
simquantum_harness_check($body === $asset, 'тело ответа байт-в-байт равно файлу тренажёра',
    sprintf('получено %d байт, файл %d байт', strlen($body), strlen($asset)));
simquantum_harness_check(stripos($headers['content-type'] ?? '', 'text/html') === 0, 'Content-Type: text/html',
    $headers['content-type'] ?? 'нет');
simquantum_harness_check(($headers['x-frame-options'] ?? '') === 'SAMEORIGIN', 'разрешена рамка только своего сайта',
    $headers['x-frame-options'] ?? 'нет');

file_put_contents($docroot . '/fixture.json', json_encode(['trainer' => 'no-such-trainer']));
[$status, $body] = simquantum_harness_http($url);
simquantum_harness_check($status === 404, 'неизвестный тренажёр: HTTP 404', (string)$status);

// В настоящем Moodle require_capability() и required_param() выбрасывают
// moodle_exception и пользователь видит страницу ошибки. Во встроенном сервере
// PHP исключение просто обрывает скрипт, поэтому проверяем главное: тренажёр не отдан.
file_put_contents($docroot . '/fixture.json', json_encode(['trainer' => 'python', 'deny' => true]));
[$status, $body] = simquantum_harness_http($url);
simquantum_harness_check($body !== $asset, 'без права просмотра содержимое не отдаётся',
    'тело: ' . substr(strip_tags($body), 0, 120));

[$status, $body] = simquantum_harness_http("http://127.0.0.1:{$port}/mod/simquantum/content.php");
simquantum_harness_check($body !== $asset, 'без параметра id запрос отклоняется',
    'тело: ' . substr(strip_tags($body), 0, 120));

proc_terminate($handle);
proc_close($handle);

echo "\n";
if ($fails > 0) {
    echo "провалов: {$fails}\n";
    exit(1);
}
echo "всё в порядке: {$passes} проверок\n";
exit(0);
