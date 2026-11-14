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
 * Страница элемента курса: описание и рамка с тренажёром.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use mod_simquantum\local\catalog;

$id = optional_param('id', 0, PARAM_INT);       // id элемента курса (course_modules).
$s = optional_param('s', 0, PARAM_INT);         // Устаревший способ: id экземпляра.

if ($id) {
    $cm = get_coursemodule_from_id('simquantum', $id, 0, false, MUST_EXIST);
    $course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
    $simquantum = $DB->get_record('simquantum', ['id' => $cm->instance], '*', MUST_EXIST);
} else if ($s) {
    $simquantum = $DB->get_record('simquantum', ['id' => $s], '*', MUST_EXIST);
    $course = $DB->get_record('course', ['id' => $simquantum->course], '*', MUST_EXIST);
    $cm = get_coursemodule_from_instance('simquantum', $simquantum->id, $course->id, false, MUST_EXIST);
} else {
    throw new moodle_exception('missingparam', 'error', '', 'id');
}

require_login($course, true, $cm);

$context = context_module::instance($cm->id);
require_capability('mod/simquantum:view', $context);

// Событие просмотра — нужно для отчётов «Активность курса» и логов.
$event = \mod_simquantum\event\course_module_viewed::create([
    'objectid' => $simquantum->id,
    'context' => $context,
]);
$event->add_record_snapshot('course', $course);
$event->add_record_snapshot('course_modules', $cm);
$event->add_record_snapshot('simquantum', $simquantum);
$event->trigger();

$PAGE->set_url('/mod/simquantum/view.php', ['id' => $cm->id]);
$PAGE->set_title(format_string($simquantum->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($context);
$PAGE->set_activity_record($simquantum);
$PAGE->add_body_class('simquantum-page');

echo $OUTPUT->header();

echo $OUTPUT->heading(format_string($simquantum->name), 2, 'main simquantum-title');

if (trim((string)$simquantum->intro) !== '') {
    echo $OUTPUT->box(
        format_module_intro('simquantum', $simquantum, $cm->id),
        'generalbox mod_introbox simquantum-intro',
        'intro'
    );
}

$trainer = catalog::get_trainer($simquantum->trainer);
$asset = catalog::asset_path($simquantum->trainer);

if ($trainer === null || $asset === null) {
    echo $OUTPUT->notification(get_string('trainermissing', 'mod_simquantum'), \core\output\notification::NOTIFY_ERROR);
    echo $OUTPUT->footer();
    exit;
}

$frameurl = new moodle_url('/mod/simquantum/content.php', ['id' => $cm->id]);
$height = catalog::clamp_height($simquantum->height);

echo html_writer::start_div('simquantum-frame', ['id' => 'simquantum-frame']);
echo html_writer::tag('iframe', '', [
    'src' => $frameurl->out(false),
    'class' => 'simquantum-iframe',
    'title' => format_string($trainer['name']),
    'style' => 'height: ' . $height . 'px;',
    'loading' => 'eager',
    'allow' => 'fullscreen',
    'referrerpolicy' => 'same-origin',
]);
echo html_writer::end_div();

echo html_writer::div(
    html_writer::link(
        $frameurl,
        get_string('opennewtab', 'mod_simquantum'),
        ['target' => '_blank', 'rel' => 'noopener', 'class' => 'simquantum-open btn btn-link']
    ),
    'simquantum-actions'
);

echo $OUTPUT->footer();
