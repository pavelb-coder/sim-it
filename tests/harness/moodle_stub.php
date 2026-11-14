<?php
// Заглушка config.php для офлайн-проверки плагина: ровно те функции и классы,
// которые используют скрипты плагина. Копируется в собранный «мини-Moodle».
define('MOODLE_INTERNAL', true);
define('PARAM_INT', 'int');
define('PARAM_ALPHANUM', 'alphanum');
define('PARAM_TEXT', 'text');
define('MUST_EXIST', 0);
define('IGNORE_MISSING', 1);
define('CONTEXT_MODULE', 70);
define('CONTEXT_COURSE', 50);
define('FEATURE_MOD_INTRO', 'mod_intro');
define('FEATURE_SHOW_DESCRIPTION', 'showdescription');
define('FEATURE_BACKUP_MOODLE2', 'backup_moodle2');
define('FEATURE_MOD_PURPOSE', 'mod_purpose');
define('FEATURE_GRADE_HAS_GRADE', 'grade_has_grade');
define('FEATURE_GRADE_OUTCOMES', 'grade_outcomes');
define('FEATURE_ADVANCED_GRADING', 'advanced_grading');
define('FEATURE_GROUPS', 'groups');
define('FEATURE_GROUPINGS', 'groupings');
define('FEATURE_COMPLETION_TRACKS_VIEWS', 'completion_views');
define('FEATURE_COMPLETION_HAS_RULES', 'completion_rules');
define('FEATURE_COMMENT', 'comment');
define('FEATURE_RATE', 'rate');
define('MOD_PURPOSE_INTERACTIVECONTENT', 'interactivecontent');

global $CFG, $DB, $SIMQ;
$CFG = new stdClass();
$CFG->wwwroot = 'http://moodle.test';
$CFG->dirroot = __DIR__;

$SIMQ = json_decode(file_get_contents(__DIR__ . '/fixture.json'), true) ?: [];
$DB = new simquantum_stub_db();

spl_autoload_register(function($class) {
    $prefix = 'mod_simquantum\\';
    if (strpos($class, $prefix) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/mod/simquantum/classes/' . strtolower(str_replace('\\', '/', $relative)) . '.php';
    if (is_file($file)) {
        require($file);
    }
});

class simquantum_stub_db {
    public array $inserted = [];
    public array $updated = [];
    public array $deleted = [];

    public function get_record($table, $conditions, $fields = '*', $strict = false) {
        global $SIMQ;
        if ($table === 'course') {
            return (object)['id' => 1, 'fullname' => 'Тестовый курс', 'shortname' => 'test'];
        }
        if ($table === 'simquantum') {
            return (object)[
                'id' => $conditions['id'] ?? 10,
                'course' => 1,
                'name' => 'Тренажёр',
                'intro' => '<p>Описание</p>',
                'introformat' => 1,
                'trainer' => $SIMQ['trainer'] ?? 'python',
                'height' => 900,
            ];
        }
        return false;
    }

    public function insert_record($table, $data) {
        $this->inserted[] = [$table, $data];
        return count($this->inserted);
    }

    public function update_record($table, $data) {
        $this->updated[] = [$table, $data];
        return true;
    }

    public function delete_records($table, $conditions) {
        $this->deleted[] = [$table, $conditions];
        return true;
    }
}

class context_module {
    public static function instance($id) {
        return (object)['id' => $id, 'contextlevel' => CONTEXT_MODULE];
    }
}

function required_param(string $name, $type) {
    if (!isset($_GET[$name])) {
        throw new Exception('missing param ' . $name);
    }
    return (int)$_GET[$name];
}

function get_coursemodule_from_id($modname, $id, $course = 0, $cm = false, $strict = false) {
    return (object)[
        'id' => (int)$id,
        'course' => 1,
        'instance' => 10,
        'name' => 'Тренажёр',
        'showdescription' => 1,
        'deletioninprogress' => 0,
        'modname' => $modname,
    ];
}

function get_coursemodule_from_instance($modname, $instance, $course, $cm = false, $strict = false) {
    return get_coursemodule_from_id($modname, 1);
}

function require_login($course, $cm = null, $coursemodule = null) {
}

function require_capability($capability, $context) {
    global $SIMQ;
    if (!empty($SIMQ['deny'])) {
        throw new Exception('capability denied: ' . $capability);
    }
}

function clean_param($value, $type) {
    if ($type === PARAM_ALPHANUM) {
        return preg_replace('/[^A-Za-z0-9]/', '', (string)$value);
    }
    if ($type === PARAM_INT) {
        return (int)$value;
    }
    return (string)$value;
}

function get_string($key, $component = '', $a = null) {
    return $key;
}

function get_config($plugin, $name = null) {
    global $SIMQ;
    if ($name === 'enabledtrainers' && isset($SIMQ['enabledtrainers'])) {
        return $SIMQ['enabledtrainers'];
    }
    return false;
}
