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
 * Событие «просмотр тренажёра».
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_simquantum\event;

defined('MOODLE_INTERNAL') || die();

/**
 * Событие фиксируется при открытии страницы элемента курса.
 */
class course_module_viewed extends \core\event\course_module_viewed {

    /**
     * Заполнить обязательные поля события.
     */
    protected function init() {
        $this->data['crud'] = 'r';
        $this->data['edulevel'] = self::LEVEL_PARTICIPATING;
        $this->data['objecttable'] = 'simquantum';
    }

    /**
     * Название события для отчётов.
     *
     * @return string
     */
    public static function get_name() {
        return get_string('eventcoursemoduleviewed', 'mod_simquantum');
    }

    /**
     * Человекочитаемое описание.
     *
     * @return string
     */
    public function get_description() {
        return "The user with id '{$this->userid}' viewed the simquantum activity with course module id " .
            "'{$this->contextinstanceid}'.";
    }

    /**
     * Ссылка на элемент курса.
     *
     * @return \moodle_url
     */
    public function get_url() {
        return new \moodle_url('/mod/simquantum/view.php', ['id' => $this->contextinstanceid]);
    }

    /**
     * Сопоставление objectid при восстановлении из резервной копии.
     *
     * @return array
     */
    public static function get_objectid_mapping() {
        return ['db' => 'simquantum', 'restore' => 'simquantum'];
    }
}
