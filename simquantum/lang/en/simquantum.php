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
 * English strings for the simquantum activity module.
 *
 * @package    mod_simquantum
 * @copyright  2026 IT Kvantum
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['modulename'] = 'IT Kvantum trainer';
$string['modulenameplural'] = 'IT Kvantum trainers';
$string['modulename_help'] = 'This activity embeds a browser-based IT Kvantum trainer into Moodle: Python class, C++ class, Linux terminal, network simulator, web studio, SQL, cybersecurity, neural networks, or a free code playground.

The trainer runs entirely in the student browser: its own Python and C++ interpreters, virtual file system, network model and SQL engine are written in JavaScript. Nothing has to be installed and no internet connection is required on the student machine — trainer files are shipped inside the plugin and served by Moodle itself.

The teacher picks a trainer and the height of the working area; the activity description is shown above the trainer.';
$string['pluginname'] = 'IT Kvantum trainer';
$string['pluginadministration'] = 'IT Kvantum trainer administration';
$string['simquantum:addinstance'] = 'Add a new IT Kvantum trainer';
$string['simquantum:view'] = 'View the IT Kvantum trainer';

$string['trainer'] = 'Trainer';
$string['trainer_help'] = 'A trainer from the IT Kvantum line. Each trainer contains theory, auto-checked tasks and a working area; the playgrounds are free coding sandboxes without tasks.';
$string['trainerinfo'] = 'The trainer works offline: all files are already inside the plugin and student progress is kept in the browser.';
$string['trainererror'] = 'Please select a trainer from the list.';
$string['trainermissing'] = 'The file of the selected trainer is missing from the plugin. Ask the administrator to update the plugin or pick another trainer in the activity settings.';
$string['height'] = 'Working area height, px';
$string['height_help'] = 'Height of the trainer frame on the activity page, in pixels. Default 900, allowed range 400 to 3000. On phones the frame adapts to the screen width and the trainer can be opened on a full page by a separate link.';
$string['heighterror'] = 'Enter a height as a number from {$a->min} to {$a->max} pixels.';
$string['taskscount'] = '{$a} auto-checked tasks';
$string['freestyle'] = 'free code, no tasks';
$string['opennewtab'] = 'Open the trainer on a full page';
$string['openactivity'] = 'Open trainer';
$string['noinstances'] = 'There are no IT Kvantum trainers in this course yet.';
$string['description'] = 'Description';
$string['eventcoursemoduleviewed'] = 'IT Kvantum trainer viewed';

$string['trainer_python'] = 'Python class';
$string['trainer_python_desc'] = 'a Python interpreter in the browser, 26 topics from print to CSV';
$string['trainer_cpp'] = 'C++ class';
$string['trainer_cpp_desc'] = 'a teaching subset of C++: types, loops, arrays, vector, functions, DP';
$string['trainer_terminal'] = 'Linux terminal';
$string['trainer_terminal_desc'] = 'virtual file system, 20+ commands, globs, permissions, redirections';
$string['trainer_network'] = 'Network simulator';
$string['trainer_network_desc'] = 'IPv4 model: subnets, masks, gateways, routing tables, a real ping';
$string['trainer_web'] = 'Web studio';
$string['trainer_web_desc'] = 'HTML and CSS with live preview and markup checks';
$string['trainer_sql'] = 'SQL trainer';
$string['trainer_sql_desc'] = 'a real query engine: SELECT, WHERE, LIKE, ORDER BY, LIMIT, aggregates';
$string['trainer_security'] = 'Cybersecurity';
$string['trainer_security_desc'] = 'base64, Caesar cipher, hashes, HTTP header audit, code review';
$string['trainer_ai'] = 'Neural network inside';
$string['trainer_ai_desc'] = 'a perceptron trains before your eyes: weights, loss, AND/OR/XOR, real data';
$string['trainer_pyplay'] = 'Python playground';
$string['trainer_pyplay_desc'] = 'free sandbox: any code, test input, output and errors';
$string['trainer_cppplay'] = 'C++ playground';
$string['trainer_cppplay_desc'] = 'free sandbox: any code in the teaching C++ subset, cin and cout';

$string['enabledtrainers'] = 'Trainers available to teachers';
$string['enabledtrainers_desc'] = 'Tick the trainers that can be added to courses. The others will not appear in the teacher selection list.';
$string['settingheading'] = 'IT Kvantum trainers';
$string['assetsheading'] = 'Trainer files inside the plugin';
$string['assetsheading_desc'] = 'Files live in the assets/ folder of the plugin. To update the trainers, replace the files and purge the Moodle caches.';

$string['privacy:metadata'] = 'The plugin stores no personal data: trainer progress stays in the student browser (localStorage) and Moodle only keeps standard activity view logs.';
