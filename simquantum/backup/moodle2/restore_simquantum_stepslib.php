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
 * Шаги восстановления элемента курса.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Структура восстановления элемента курса «Тренажёр IT-квантума».
 */
class restore_simquantum_activity_structure_step extends restore_activity_structure_step {

    /**
     * Описание структуры.
     *
     * @return array
     */
    protected function define_structure() {
        $paths = [];
        $paths[] = new restore_path_element('simquantum', '/activity/simquantum');
        return $this->prepare_activity_structure($paths);
    }

    /**
     * Восстановить запись элемента курса.
     *
     * @param array $data данные из файла копии
     */
    protected function process_simquantum($data) {
        global $DB;

        $data = (object)$data;
        $data->course = $this->get_courseid();

        $data->trainer = isset($data->trainer) ? clean_param($data->trainer, PARAM_ALPHANUM) : '';
        if (!\mod_simquantum\local\catalog::is_valid($data->trainer)) {
            $data->trainer = \mod_simquantum\local\catalog::default_trainer();
        }
        $data->height = \mod_simquantum\local\catalog::clamp_height($data->height ?? 0);

        $data->timecreated = isset($data->timecreated) ? (int)$data->timecreated : time();
        $data->timemodified = time();

        $newitemid = $DB->insert_record('simquantum', $data);
        $this->apply_activity_instance($newitemid);
    }
}
