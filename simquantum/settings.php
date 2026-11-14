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
 * Настройки плагина на уровне сайта.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

use mod_simquantum\local\catalog;

if ($ADMIN->fulltree) {

    $settings->add(new admin_setting_heading(
        'mod_simquantum_settingheading',
        get_string('settingheading', 'mod_simquantum'),
        get_string('modulename_help', 'mod_simquantum')
    ));

    $options = [];
    foreach (catalog::all_slugs() as $slug) {
        if (catalog::asset_path($slug) === null) {
            continue;   // Файла нет — предлагать нечего.
        }
        $options[$slug] = get_string('trainer_' . $slug, 'mod_simquantum');
    }

    $settings->add(new admin_setting_configmulticheckbox(
        'mod_simquantum/enabledtrainers',
        get_string('enabledtrainers', 'mod_simquantum'),
        get_string('enabledtrainers_desc', 'mod_simquantum'),
        array_fill_keys(array_keys($options), 1),
        $options
    ));

    $settings->add(new admin_setting_heading(
        'mod_simquantum_assetsheading',
        get_string('assetsheading', 'mod_simquantum'),
        get_string('assetsheading_desc', 'mod_simquantum')
    ));
}
