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
 * Задача резервного копирования элемента курса.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/simquantum/backup/moodle2/backup_simquantum_stepslib.php');

/**
 * Резервное копирование элемента курса «Тренажёр IT-квантума».
 */
class backup_simquantum_activity_task extends backup_activity_task {

    /**
     * Своих настроек у задачи нет.
     */
    protected function define_my_settings() {
    }

    /**
     * Шаги копирования.
     */
    protected function define_my_steps() {
        $this->add_step(new backup_simquantum_activity_structure_step('simquantum_structure', 'simquantum.xml'));
    }

    /**
     * Кодирование ссылок на элемент курса в текстах.
     *
     * @param string $content текст
     * @return string
     */
    public static function encode_content_links($content) {
        global $CFG;

        $base = preg_quote($CFG->wwwroot . '/mod/simquantum', '#');
        $content = preg_replace('#(' . $base . '/index\.php\?id=)([0-9]+)#', '$@SIMQUANTUMINDEX*$2@$', $content);
        $content = preg_replace('#(' . $base . '/view\.php\?id=)([0-9]+)#', '$@SIMQUANTUMVIEW*$2@$', $content);

        return $content;
    }
}
