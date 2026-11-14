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
 * Каталог тренажёров: какие площадки есть в плагине и откуда их брать.
 *
 * Файлы тренажёров лежат в assets/ и отдаются скриптом content.php — это
 * автономные HTML-страницы (свой движок, свой CSS и JS внутри), поэтому
 * наружу ничего не запрашивается и интернет на машине ученика не нужен.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT-квантум
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_simquantum\local;

/**
 * Справочник доступных тренажёров и их файлов.
 */
class catalog {

    /** Тренажёр по умолчанию. */
    const DEFAULT_TRAINER = 'python';

    /** Высота рамки по умолчанию, px. */
    const DEFAULT_HEIGHT = 900;

    /** Минимальная и максимальная высота рамки, px. */
    const MIN_HEIGHT = 400;
    const MAX_HEIGHT = 3000;

    /**
     * @var array Код тренажёра => файл в assets/ и число задач.
     */
    const TRAINERS = [
        'python'   => ['file' => 'python.html',   'tasks' => 239],
        'cpp'      => ['file' => 'cpp.html',      'tasks' => 211],
        'terminal' => ['file' => 'terminal.html', 'tasks' => 25],
        'network'  => ['file' => 'network.html',  'tasks' => 22],
        'web'      => ['file' => 'web.html',      'tasks' => 22],
        'sql'      => ['file' => 'sql.html',      'tasks' => 28],
        'security' => ['file' => 'security.html', 'tasks' => 21],
        'ai'       => ['file' => 'ai.html',       'tasks' => 15],
        'pyplay'   => ['file' => 'pyplay.html',   'tasks' => 0],
        'cppplay'  => ['file' => 'cppplay.html',  'tasks' => 0],
    ];

    /**
     * Список кодов всех тренажёров плагина.
     *
     * @return string[]
     */
    public static function all_slugs(): array {
        return array_keys(self::TRAINERS);
    }

    /**
     * Тренажёры, разрешённые администратором сайта.
     *
     * @return array Код => описание тренажёра (name, tagline, tasks, file, slug).
     */
    public static function get_trainers(): array {
        $enabled = self::enabled_slugs();
        $trainers = [];
        foreach (self::TRAINERS as $slug => $meta) {
            if (!in_array($slug, $enabled, true)) {
                continue;
            }
            $item = self::describe($slug);
            if ($item !== null) {
                $trainers[$slug] = $item;
            }
        }
        // Если администратор отключил всё (или файлов нет) — не оставляем преподавателя без выбора.
        if (!$trainers) {
            $fallback = self::describe(self::default_trainer());
            if ($fallback !== null) {
                $trainers[self::default_trainer()] = $fallback;
            }
        }
        return $trainers;
    }

    /**
     * Коды тренажёров, включённых в настройках плагина.
     *
     * @return string[]
     */
    public static function enabled_slugs(): array {
        $setting = get_config('mod_simquantum', 'enabledtrainers');
        if ($setting === false || $setting === null || $setting === '') {
            return self::all_slugs();
        }
        if (is_array($setting)) {
            $list = $setting;
        } else {
            $list = explode(',', (string)$setting);
        }
        $list = array_values(array_filter(array_map('trim', $list), static function($slug) {
            return isset(self::TRAINERS[$slug]);
        }));
        return $list ?: self::all_slugs();
    }

    /**
     * Описание одного тренажёра.
     *
     * @param string $slug код тренажёра
     * @return array|null
     */
    public static function get_trainer(string $slug): ?array {
        return self::describe($slug);
    }

    /**
     * Полное описание тренажёра с подписями из языковых файлов.
     *
     * @param string $slug код тренажёра
     * @return array|null
     */
    protected static function describe(string $slug): ?array {
        if (!isset(self::TRAINERS[$slug])) {
            return null;
        }
        $meta = self::TRAINERS[$slug];
        return [
            'slug'    => $slug,
            'file'    => $meta['file'],
            'tasks'   => $meta['tasks'],
            'name'    => get_string('trainer_' . $slug, 'mod_simquantum'),
            'tagline' => get_string('trainer_' . $slug . '_desc', 'mod_simquantum'),
        ];
    }

    /**
     * Тренажёр по умолчанию: первый доступный.
     *
     * @return string
     */
    public static function default_trainer(): string {
        if (self::describe(self::DEFAULT_TRAINER) === null) {
            return self::all_slugs()[0];
        }
        return self::DEFAULT_TRAINER;
    }

    /**
     * Абсолютный путь к файлу тренажёра. Только для известных кодов —
     * подстановка произвольного имени файла невозможна.
     *
     * @param string $slug код тренажёра
     * @return string|null путь к существующему файлу
     */
    public static function asset_path(string $slug): ?string {
        if (!isset(self::TRAINERS[$slug])) {
            return null;
        }
        $path = __DIR__ . '/../../assets/' . self::TRAINERS[$slug]['file'];
        return is_readable($path) ? $path : null;
    }

    /**
     * Проверка, что код тренажёра известен.
     *
     * @param string $slug код тренажёра
     * @return bool
     */
    public static function is_valid(string $slug): bool {
        return isset(self::TRAINERS[$slug]);
    }

    /**
     * Привести высоту рамки к допустимым значениям.
     *
     * @param mixed $height высота в пикселях
     * @return int
     */
    public static function clamp_height($height): int {
        $height = (int)$height;
        if ($height < self::MIN_HEIGHT) {
            return self::DEFAULT_HEIGHT;
        }
        return min(max($height, self::MIN_HEIGHT), self::MAX_HEIGHT);
    }
}
