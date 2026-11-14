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
 * Отдаёт автономную HTML-страницу тренажёра для рамки на странице элемента курса.
 *
 * Файл тренажёра берётся только из assets/ по коду из настроек элемента курса,
 * поэтому подставить произвольный путь через параметры нельзя. Скрипт ничего
 * не печатает от себя: байт-в-байт отдаёт содержимое файла.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use mod_simquantum\local\catalog;

$id = required_param('id', PARAM_INT);

$cm = get_coursemodule_from_id('simquantum', $id, 0, false, MUST_EXIST);
$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$simquantum = $DB->get_record('simquantum', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, true, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/simquantum:view', $context);

$path = catalog::asset_path($simquantum->trainer);
if ($path === null) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'simquantum: файл тренажёра не найден';
    exit;
}

// Тренажёр — автономная страница со своими скриптами и стилями:
// ни одного внешнего запроса, поэтому встраивать в рамку того же сайта безопасно.
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: same-origin');
header('Cache-Control: private, max-age=300');

readfile($path);
exit;
