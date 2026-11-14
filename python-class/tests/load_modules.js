// Загружает все модули задач из src/modules и отдаёт плоский список.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'modules');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();

function load() {
  const mods = [];
  const window = {};
  for (const f of files) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    // модули написаны как IIFE от window/globalThis
    new Function('window', 'globalThis', 'module', code)(window, window, {});
  }
  return window.PYMODULES || [];
}

module.exports = { load, files };
