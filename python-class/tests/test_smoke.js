const Py = require(require('path').join(__dirname, '..', 'src', 'py.js'));
const cases = [
  ['print("Привет, мир!")', []],
  ['a = 2\nb = 3\nprint(a + b)', []],
  ['n = int(input())\nprint(n * 2)', ['21']],
  ['for i in range(3):\n    print(i)', []],
  ['x = 5\nif x % 2 == 0:\n    print("чётное")\nelse:\n    print("нечётное")', []],
  ['def f(n):\n    return n * n\nprint(f(4))', []],
  ['s = "Привет"\nprint(s[::-1])\nprint(len(s))\nprint(s.upper())', []],
  ['lst = [3, 1, 2]\nlst.sort()\nprint(lst)\nprint(sum(lst))', []],
  ['d = {}\nfor ch in "абракадабра":\n    d[ch] = d.get(ch, 0) + 1\nprint(d["а"])', []],
  ['print(f"итог: {2 + 3}")', []],
  ['i = 0\nwhile i < 3:\n    print(i)\n    i += 1', []],
  ['print(", ".join(["a", "b"]))', []],
  ['for i, v in enumerate(["x", "y"]):\n    print(i, v)', []],
  ['print(7 // 2, 7 % 2, 2 ** 10, 7 / 2)', []],
  ['print([1,2,3][1:], "abc"[1:3])', []],
  ['import math\nprint(math.sqrt(16))', []],
  ['print(max([4,9,2]), min(4,9,2), abs(-3))', []],
  ['a, b = 1, 2\na, b = b, a\nprint(a, b)', []],
  ['print(True and not False, 1 == 1, "a" in "abc")', []],
  ['print(round(3.14159, 2))', []],
];
let fail = 0;
for (const [code, stdin] of cases) {
  const r = Py.run(code, { stdin });
  console.log(JSON.stringify(code.slice(0, 40)), '->', r.ok ? JSON.stringify(r.output) : 'ERR ' + r.error.kind + ': ' + r.error.msg + ' (стр ' + r.error.line + ')');
  if (!r.ok) fail++;
}
console.log('errors:', fail);
