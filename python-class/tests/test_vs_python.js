const Py = require(require('path').join(__dirname, '..', 'src', 'py.js'));
const cases = require(require('path').join(__dirname, 'cases.json'));
const ref = require(require('path').join(__dirname, 'ref.json'));
let bad = 0;
cases.forEach((c, i) => {
  const r = Py.run(c.code, { stdin: c.stdin });
  const out = r.ok ? r.output : null;
  const same = r.ok === ref[i].ok && (r.ok ? out.trim() === ref[i].out.trim() : true);
  if (!same) {
    bad++;
    console.log('--- #' + i + '\n' + c.code);
    console.log('  ref:', ref[i].ok ? JSON.stringify(ref[i].out) : 'ERR ' + ref[i].err);
    console.log('  our:', r.ok ? JSON.stringify(r.output) : 'ERR ' + r.error.kind + ': ' + r.error.msg + ' line ' + r.error.line);
  }
});
console.log('mismatches:', bad, '/', cases.length);
