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
 * Основные функции элемента курса «Тренажёр IT-квантума».
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

use mod_simquantum\local\catalog;

/**
 * Какие возможности поддерживает элемент курса.
 *
 * @param string $feature константа FEATURE_*
 * @return mixed true/false или значение, либо null если возможности нет
 */
function simquantum_supports($feature) {
    switch ($feature) {
        case FEATURE_MOD_INTRO:
            return true;
        case FEATURE_SHOW_DESCRIPTION:
            return true;
        case FEATURE_BACKUP_MOODLE2:
            return true;
        case FEATURE_MOD_PURPOSE:
            return MOD_PURPOSE_INTERACTIVECONTENT;
        case FEATURE_GRADE_HAS_GRADE:
        case FEATURE_GRADE_OUTCOMES:
        case FEATURE_ADVANCED_GRADING:
        case FEATURE_GROUPS:
        case FEATURE_GROUPINGS:
        case FEATURE_COMPLETION_TRACKS_VIEWS:
        case FEATURE_COMPLETION_HAS_RULES:
        case FEATURE_COMMENT:
        case FEATURE_RATE:
            return false;
        default:
            return null;
    }
}

/**
 * Добавить новый экземпляр элемента курса.
 *
 * @param stdClass $data данные формы
 * @param mod_simquantum_mod_form|null $mform форма
 * @return int id записи
 */
function simquantum_add_instance($data, $mform = null) {
    global $DB;

    $data->timecreated = time();
    $data->timemodified = $data->timecreated;
    $data->trainer = simquantum_clean_trainer($data->trainer ?? '');
    $data->height = catalog::clamp_height($data->height ?? catalog::DEFAULT_HEIGHT);

    return $DB->insert_record('simquantum', $data);
}

/**
 * Обновить существующий экземпляр элемента курса.
 *
 * @param stdClass $data данные формы (с полем instance)
 * @param mod_simquantum_mod_form|null $mform форма
 * @return bool
 */
function simquantum_update_instance($data, $mform = null) {
    global $DB;

    $data->id = $data->instance;
    $data->timemodified = time();
    $data->trainer = simquantum_clean_trainer($data->trainer ?? '');
    $data->height = catalog::clamp_height($data->height ?? catalog::DEFAULT_HEIGHT);

    return $DB->update_record('simquantum', $data);
}

/**
 * Удалить экземпляр элемента курса.
 *
 * @param int $id id записи в таблице simquantum
 * @return bool
 */
function simquantum_delete_instance($id) {
    global $DB;

    if (!$simquantum = $DB->get_record('simquantum', ['id' => $id])) {
        return false;
    }
    $DB->delete_records('simquantum', ['id' => $simquantum->id]);
    return true;
}

/**
 * Привести код тренажёра к допустимому значению.
 *
 * @param string $slug код из формы
 * @return string
 */
function simquantum_clean_trainer($slug) {
    $slug = clean_param((string)$slug, PARAM_ALPHANUM);
    if (!catalog::is_valid($slug) || catalog::asset_path($slug) === null) {
        return catalog::default_trainer();
    }
    return $slug;
}

/**
 * Данные для списка элементов курса и для страницы курса.
 *
 * @param stdClass $coursemodule запись course_modules
 * @return cached_cm_info|false
 */
function simquantum_get_coursemodule_info($coursemodule) {
    global $DB;

    $fields = 'id, name, intro, introformat, trainer, height';
    if (!$simquantum = $DB->get_record('simquantum', ['id' => $coursemodule->instance], $fields)) {
        return false;
    }

    $info = new cached_cm_info();
    $info->name = $simquantum->name;
    if ($coursemodule->showdescription) {
        $info->content = format_module_intro('simquantum', $simquantum, $coursemodule->id, false);
    }
    $info->customdata = ['trainer' => $simquantum->trainer];

    return $info;
}

/**
 * Очистка данных при сбросе курса.
 *
 * @param stdClass $data параметры сброса
 * @return array список изменений
 */
function simquantum_reset_userdata($data) {
    return [];
}
