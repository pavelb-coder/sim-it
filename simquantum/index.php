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
 * Список всех тренажёров курса (страница index.php в курсе).
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use mod_simquantum\local\catalog;

$id = required_param('id', PARAM_INT);   // id курса.

$course = $DB->get_record('course', ['id' => $id], '*', MUST_EXIST);
require_course_login($course, true);

$PAGE->set_url('/mod/simquantum/index.php', ['id' => $course->id]);
$PAGE->set_title(format_string($course->fullname));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context(context_course::instance($course->id));

$modinfo = get_fast_modinfo($course);
$instances = $modinfo->get_instances_of('simquantum');

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('modulenameplural', 'mod_simquantum'));

if (!$instances) {
    notice(get_string('noinstances', 'mod_simquantum'),
        new moodle_url('/course/view.php', ['id' => $course->id]));
}

$table = new html_table();
$table->head = [
    get_string('name'),
    get_string('trainer', 'mod_simquantum'),
    get_string('action', 'moodle'),
];
$table->attributes['class'] = 'generaltable mod_simquantum-list';

foreach ($instances as $cm) {
    if (!$cm->uservisible) {
        continue;
    }
    $simquantum = $DB->get_record('simquantum', ['id' => $cm->instance], 'id, trainer', IGNORE_MISSING);
    $trainer = $simquantum ? catalog::get_trainer($simquantum->trainer) : null;
    $table->data[] = [
        html_writer::link(new moodle_url('/mod/simquantum/view.php', ['id' => $cm->id]), format_string($cm->name)),
        $trainer ? format_string($trainer['name']) : get_string('trainermissing', 'mod_simquantum'),
        html_writer::link(new moodle_url('/mod/simquantum/view.php', ['id' => $cm->id]), get_string('openactivity', 'mod_simquantum')),
    ];
}

echo html_writer::table($table);
echo $OUTPUT->footer();
