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
 * Обновления схемы данных плагина mod_simquantum.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Обработчик обновлений.
 *
 * @param int $oldversion установленная версия плагина
 * @return bool
 */
function xmldb_simquantum_upgrade($oldversion) {
    global $DB;

    // Пример будущего обновления:
    // if ($oldversion < 2027010100) { ... upgrade_mod_savepoint(true, 2027010100, 'simquantum'); }

    return true;
}
