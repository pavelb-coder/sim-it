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
 * Шаги резервного копирования элемента курса.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Структура данных элемента курса для резервной копии.
 */
class backup_simquantum_activity_structure_step extends backup_activity_structure_step {

    /**
     * Описание структуры.
     *
     * @return backup_nested_element
     */
    protected function define_structure() {
        $userinfo = $this->get_setting_value('userinfo');

        $simquantum = new backup_nested_element('simquantum', ['id'], [
            'name', 'intro', 'introformat', 'trainer', 'height', 'timecreated', 'timemodified',
        ]);

        $simquantum->set_source_table('simquantum', ['id' => backup::VAR_ACTIVITYID]);

        if ($userinfo) {
            // Своих пользовательских таблиц у плагина нет: прогресс хранится в браузере ученика.
            // Блок оставлен как точка расширения и ничего не экспортирует.
        }

        return $this->prepare_activity_structure($simquantum);
    }
}
