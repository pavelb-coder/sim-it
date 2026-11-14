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
 * Форма создания и редактирования элемента курса «Тренажёр IT-квантума».
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/course/moodleform_mod.php');

use mod_simquantum\local\catalog;

/**
 * Форма настройки элемента курса.
 */
class mod_simquantum_mod_form extends moodleform_mod {

    /**
     * Описание полей формы.
     */
    public function definition() {
        global $CFG;

        $mform = $this->_form;

        $mform->addElement('header', 'general', get_string('general', 'form'));

        $mform->addElement('text', 'name', get_string('name'), ['size' => '64']);
        $mform->setType('name', PARAM_TEXT);
        $mform->addRule('name', null, 'required', null, 'client');
        $mform->addRule('name', get_string('maximumchars', '', 255), 'maxlength', 255, 'client');

        $this->standard_intro_elements(get_string('description', 'mod_simquantum'));

        // Выбор тренажёра: в подписи сразу видно, сколько в нём задач.
        $options = [];
        foreach (catalog::get_trainers() as $slug => $trainer) {
            if ($trainer['tasks'] > 0) {
                $suffix = get_string('taskscount', 'mod_simquantum', $trainer['tasks']);
            } else {
                $suffix = get_string('freestyle', 'mod_simquantum');
            }
            $options[$slug] = $trainer['name'] . ' — ' . $suffix;
        }
        $mform->addElement('select', 'trainer', get_string('trainer', 'mod_simquantum'), $options);
        $mform->addHelpButton('trainer', 'trainer', 'mod_simquantum');
        $mform->setDefault('trainer', catalog::default_trainer());
        $mform->addElement('static', 'trainerinfo', '', get_string('trainerinfo', 'mod_simquantum'));

        // Высота рабочей области.
        $mform->addElement('text', 'height', get_string('height', 'mod_simquantum'), ['size' => '6']);
        $mform->setType('height', PARAM_INT);
        $mform->setDefault('height', catalog::DEFAULT_HEIGHT);
        $mform->addHelpButton('height', 'height', 'mod_simquantum');
        $mform->addRule('height', get_string('heighterror', 'mod_simquantum'), 'numeric', null, 'client');

        $this->standard_coursemodule_elements();
        $this->add_action_buttons();
    }

    /**
     * Проверка введённых значений.
     *
     * @param array $data данные формы
     * @param array $files загруженные файлы
     * @return array ошибки
     */
    public function validation($data, $files) {
        $errors = parent::validation($data, $files);

        if (isset($data['height'])) {
            $height = (int)$data['height'];
            if ($height < catalog::MIN_HEIGHT || $height > catalog::MAX_HEIGHT) {
                $a = (object)['min' => catalog::MIN_HEIGHT, 'max' => catalog::MAX_HEIGHT];
                $errors['height'] = get_string('heighterror', 'mod_simquantum', $a);
            }
        }

        if (empty($data['trainer']) || !catalog::is_valid($data['trainer'])) {
            $errors['trainer'] = get_string('trainererror', 'mod_simquantum');
        }

        return $errors;
    }
}
