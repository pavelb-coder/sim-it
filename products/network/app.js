/* ==========================================================================
   Симулятор сети: IPv4-адресация, маски, L2-сегменты, статическая маршрутизация.
   Ping считается по-настоящему: подсеть → шлюз → таблица маршрутов → L2-доставка.
   ========================================================================== */
(function (global) {
  'use strict';

  var state = { topo: null, lastPing: null };

  /* ------------------------------- IPv4 ------------------------------- */
  function ipToInt(ip) {
    var p = String(ip || '').trim().split('.');
    if (p.length !== 4) return null;
    var n = 0;
    for (var i = 0; i < 4; i++) {
      var v = parseInt(p[i], 10);
      if (!(v >= 0 && v <= 255) || String(v) !== p[i].replace(/^0+(?=\d)/, '')) return null;
      n = n * 256 + v;
    }
    return n;
  }
  function intToIp(n) {
    return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.');
  }
  function prefixOf(mask) {
    var p = parseInt(String(mask || '').replace('/', ''), 10);
    return (p >= 0 && p <= 32) ? p : null;
  }
  function maskToInt(prefix) {
    if (prefix === 0) return 0;
    return (0xFFFFFFFF << (32 - prefix)) >>> 0;
  }
  function network(ipInt, prefix) {
    return (ipInt & maskToInt(prefix)) >>> 0;
  }
  function sameSubnet(ipA, ipB, mask) {
    var a = ipToInt(ipA), b = ipToInt(ipB), p = prefixOf(mask);
    if (a === null || b === null || p === null) return false;
    return network(a, p) === network(b, p);
  }

  /* ------------------------------ топология ------------------------------ */
  function dev(id) {
    for (var i = 0; i < state.topo.devices.length; i++) {
      if (state.topo.devices[i].id === id) return state.topo.devices[i];
    }
    return null;
  }
  function devByName(name) {
    for (var i = 0; i < state.topo.devices.length; i++) {
      if (state.topo.devices[i].name === name) return state.topo.devices[i];
    }
    return null;
  }
  function interfacesOf(d) {
    if (!d) return [];
    if (d.type === 'router') return (d.ifaces || []).map(function (f) { return { name: f.name, ip: f.ip, mask: f.mask }; });
    if (d.type === 'pc') return d.ip ? [{ name: 'eth0', ip: d.ip, mask: d.mask }] : [];
    return [];
  }
  function neighborList(id) {
    var out = [];
    state.topo.links.forEach(function (l) {
      if (l[0] === id) out.push(l[1]);
      if (l[1] === id) out.push(l[0]);
    });
    return out;
  }

  // L2-домен: устройства, связанные через коммутаторы. Маршрутизатор входит в сегмент
  // своим интерфейсом, но кадры через него не проходят — он разрывает домен.
  function l2Domain(id) {
    var seen = {}, queue = [id];
    seen[id] = true;
    while (queue.length) {
      var cur = queue.shift();
      neighborList(cur).forEach(function (n) {
        if (seen[n]) return;
        var nd = dev(n);
        if (!nd) return;
        seen[n] = true;
        if (nd.type === 'switch') queue.push(n);   // только коммутатор продолжает сегмент
      });
    }
    return seen;
  }
  function l2Reachable(a, b) {
    if (a === b) return true;
    return !!l2Domain(a)[b];
  }

  function ownerOfIp(ip) {
    for (var i = 0; i < state.topo.devices.length; i++) {
      var f = interfacesOf(state.topo.devices[i]);
      for (var j = 0; j < f.length; j++) {
        if (f[j].ip === ip) return state.topo.devices[i];
      }
    }
    return null;
  }

  /* -------------------------------- ping -------------------------------- */
  function simulatePing(srcName, dstName) {
    var src = devByName(srcName), dst = devByName(dstName);
    var log = [];
    function line(text, cls) { log.push({ text: text, cls: cls || '' }); }
    function fail(text) { line('✕ ' + text, 'err'); return { ok: false, log: log }; }
    function ok(text) { line('✔ ' + text, 'ok'); return { ok: true, log: log }; }

    if (!src || !dst) return fail('не выбраны устройства');
    var srcIf = interfacesOf(src)[0], dstIf = interfacesOf(dst)[0];
    if (!srcIf || !srcIf.ip) return fail(src.name + ': не задан IP-адрес');
    if (!dstIf || !dstIf.ip) return fail(dst.name + ': не задан IP-адрес');
    if (!prefixOf(srcIf.mask)) return fail(src.name + ': неверная маска ' + srcIf.mask);

    line('[ ' + src.name + ' ] ' + srcIf.ip + srcIf.mask + ' → ' + dst.name + ' ' + dstIf.ip + dstIf.mask);

    if (src === dst) return ok('это тот же адрес, ping не нужен');

    // 1. Цель в моей подсети?
    if (sameSubnet(srcIf.ip, dstIf.ip, srcIf.mask)) {
      line('[ ' + src.name + ' ] ' + dstIf.ip + ' в моей подсети ' + intToIp(network(ipToInt(srcIf.ip), prefixOf(srcIf.mask))) + srcIf.mask);
      if (l2Reachable(src.id, dst.id)) return ok('доставлено напрямую на канальном уровне (через коммутатор)');
      return fail('адрес в одной подсети, но канальной связи нет: устройства в разных L2-сегментах. ' +
        'Объедини их коммутатором или разнеси подсети и добавь маршрутизатор.');
    }

    // 2. Нужен шлюз
    if (!src.gw) return fail(src.name + ': цель в другой подсети, а шлюз не задан');
    if (!sameSubnet(srcIf.ip, src.gw, srcIf.mask)) {
      return fail(src.name + ': шлюз ' + src.gw + ' не входит в мою подсеть ' + srcIf.mask + ' — пакет уйдёт в никуда');
    }
    var hop = ownerOfIp(src.gw);
    if (!hop) return fail('шлюз ' + src.gw + ' не найден ни у одного устройства');
    if (!l2Reachable(src.id, hop.id)) return fail('до шлюза ' + src.gw + ' нет канальной связи');
    line('[ ' + src.name + ' ] отправляю шлюзу ' + src.gw + ' (' + hop.name + ')');

    // 3. Идём по маршрутизаторам
    var cur = hop, ttl = 4;
    while (ttl-- > 0) {
      if (cur.type !== 'router') {
        var curIf = interfacesOf(cur)[0];
        if (curIf && sameSubnet(curIf.ip, dstIf.ip, curIf.mask) && l2Reachable(cur.id, dst.id)) {
          return ok('пакет доставлен через ' + cur.name);
        }
        return fail(cur.name + ' не маршрутизатор и не знает, куда отдать пакет для ' + dstIf.ip);
      }
      line('[ ' + cur.name + ' ] пакет для ' + dstIf.ip + ', смотрю таблицу маршрутов');
      var chosen = null, chosenWhy = '';
      // подключённые сети
      interfacesOf(cur).forEach(function (f) {
        if (!f.ip || !prefixOf(f.mask)) return;
        if (sameSubnet(f.ip, dstIf.ip, f.mask) && !chosen) {
          chosen = { via: '', iface: f.name, net: intToIp(network(ipToInt(f.ip), prefixOf(f.mask))) + f.mask };
          chosenWhy = 'сеть присоединена напрямую';
        }
      });
      // статические маршруты (длиннейший префикс)
      var bestLen = -1;
      (cur.routes || []).forEach(function (r) {
        if (!r.dest || !prefixOf(r.mask)) return;
        var d = ipToInt(r.dest);
        if (d === null) return;
        var p = prefixOf(r.mask);
        if (network(ipToInt(dstIf.ip), p) === network(d, p) && p > bestLen) {
          bestLen = p;
          chosen = { via: r.via, iface: r.iface || '', net: r.dest + r.mask };
          chosenWhy = r.via ? ('маршрут ' + r.dest + r.mask + ' через ' + r.via) : ('маршрут ' + r.dest + r.mask + ' напрямую');
        }
      });
      if (!chosen) {
        return fail(cur.name + ': нет маршрута до ' + dstIf.ip + '. Добавь статический маршрут или подключи сеть.');
      }
      line('[ ' + cur.name + ' ] выбран ' + chosenWhy);

      var nextIp = chosen.via || dstIf.ip;
      var nextDev = ownerOfIp(nextIp);
      if (!nextDev) return fail(cur.name + ': следующий адрес ' + nextIp + ' не принадлежит ни одному устройству');
      if (!l2Reachable(cur.id, nextDev.id)) return fail(cur.name + ': до ' + nextDev.name + ' нет канальной связи');
      if (nextDev.id === dst.id) return ok('пакет доставлен в ' + dst.name + ' через ' + cur.name);
      cur = nextDev;
    }
    return fail('слишком много переходов — похоже на петлю маршрутизации');
  }

  /* ------------------------------- отрисовка ------------------------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderTopology() {
    var host = $('topoList');
    var html = '';
    state.topo.devices.forEach(function (d) {
      html += '<div class="net-dev ' + d.type + '">';
      html += '<div class="net-dev-head"><b>' + esc(d.name) + '</b><span class="chip">' + d.type + '</span></div>';
      if (d.type === 'pc') {
        html += '<label class="net-field">IP <input class="ws-input" data-dev="' + d.id + '" data-field="ip" value="' + esc(d.ip || '') + '" placeholder="192.168.1.10"></label>';
        html += '<label class="net-field">маска <select class="ws-input" data-dev="' + d.id + '" data-field="mask">' +
          maskOptions(d.mask) + '</select></label>';
        html += '<label class="net-field">шлюз <input class="ws-input" data-dev="' + d.id + '" data-field="gw" value="' + esc(d.gw || '') + '" placeholder="не задан"></label>';
      } else if (d.type === 'router') {
        (d.ifaces || []).forEach(function (f, i) {
          html += '<div class="net-iface"><span class="net-iface-name">' + esc(f.name) + '</span>' +
            '<input class="ws-input" data-dev="' + d.id + '" data-iface="' + i + '" data-field="ip" value="' + esc(f.ip || '') + '" placeholder="10.0.0.1">' +
            '<select class="ws-input" data-dev="' + d.id + '" data-iface="' + i + '" data-field="mask">' + maskOptions(f.mask) + '</select></div>';
        });
        html += '<div class="net-routes"><div class="ws-label">маршруты</div>';
        (d.routes || []).forEach(function (r, i) {
          html += '<div class="net-route">' +
            '<input class="ws-input" data-dev="' + d.id + '" data-route="' + i + '" data-field="dest" value="' + esc(r.dest || '') + '" placeholder="192.168.2.0">' +
            '<select class="ws-input" data-dev="' + d.id + '" data-route="' + i + '" data-field="mask">' + maskOptions(r.mask) + '</select>' +
            '<input class="ws-input" data-dev="' + d.id + '" data-route="' + i + '" data-field="via" value="' + esc(r.via || '') + '" placeholder="через (пусто = напрямую)">' +
            '</div>';
        });
        html += '</div>';
      } else {
        html += '<div class="ws-label">коммутатор: пересылает кадры внутри сегмента</div>';
      }
      html += '</div>';
    });
    host.innerHTML = html;

    Array.prototype.forEach.call(host.querySelectorAll('input, select'), function (el) {
      el.addEventListener('input', applyField);
      el.addEventListener('change', applyField);
    });

    // связи
    var links = state.topo.links.map(function (l) {
      var a = dev(l[0]), b = dev(l[1]);
      return (a ? a.name : l[0]) + ' — ' + (b ? b.name : l[1]);
    });
    $('linksLine').textContent = 'Связи: ' + links.join(' · ');

    // селекты ping
    var options = state.topo.devices.filter(function (d) { return d.type !== 'switch'; })
      .map(function (d) { return '<option value="' + esc(d.name) + '">' + esc(d.name) + '</option>'; }).join('');
    ['pingSrc', 'pingDst'].forEach(function (id, idx) {
      var sel = $(id), prev = sel.value;
      sel.innerHTML = options;
      if (prev) sel.value = prev;
      if (!sel.value && sel.options.length) sel.selectedIndex = idx === 0 ? 0 : Math.min(1, sel.options.length - 1);
    });
  }

  function maskOptions(current) {
    var out = '';
    for (var p = 32; p >= 8; p--) {
      out += '<option value="/' + p + '"' + (String(current) === '/' + p ? ' selected' : '') + '>/' + p + '</option>';
    }
    return out;
  }

  function applyField(e) {
    var el = e.target;
    var d = dev(el.getAttribute('data-dev'));
    if (!d) return;
    var field = el.getAttribute('data-field');
    var iface = el.getAttribute('data-iface');
    var route = el.getAttribute('data-route');
    var value = el.value.trim();
    if (iface !== null && iface !== undefined) d.ifaces[parseInt(iface, 10)][field] = value;
    else if (route !== null && route !== undefined) d.routes[parseInt(route, 10)][field] = value;
    else d[field] = value;
  }

  function renderPing(res) {
    var out = $('pingLog');
    if (!res) { out.innerHTML = '<span class="dim">Выбери источник и цель, затем нажми «Пинговать».</span>'; return; }
    out.innerHTML = res.log.map(function (l) {
      return '<div class="' + l.cls + '">' + esc(l.text) + '</div>';
    }).join('');
  }

  /* --------------------------------- API --------------------------------- */
  window.NetAPI = {
    ping: function (srcName, dstName) { return simulatePing(srcName, dstName); },
    dev: devByName,
    iface: function (name, i) {
      var d = devByName(name);
      var f = interfacesOf(d);
      return f[i || 0] || null;
    },
    routes: function (name) {
      var d = devByName(name);
      return d && d.routes ? d.routes : [];
    },
    topo: function () { return state.topo; },
    sameSubnet: sameSubnet
  };

  /* -------------------------------- запуск -------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    $('btnPing').addEventListener('click', function () {
      var res = simulatePing($('pingSrc').value, $('pingDst').value);
      state.lastPing = res;
      renderPing(res);
    });
    $('btnPingReverse').addEventListener('click', function () {
      var a = $('pingSrc').value;
      $('pingSrc').value = $('pingDst').value;
      $('pingDst').value = a;
      var res = simulatePing($('pingSrc').value, $('pingDst').value);
      state.lastPing = res;
      renderPing(res);
    });

    window.Shell.init({
      storageKey: 'net.v1',
      productTitle: 'Симулятор сети',
      productSubtitle: 'IP, маски и маршрутизация',
      tasks: window.NET_TASKS,
      open: function (task) {
        state.topo = JSON.parse(JSON.stringify(task.topology));
        state.lastPing = null;
        renderTopology();
        renderPing(null);
      },
      check: function (task) {
        return task.checks.map(function (c) {
          var ok = false, note = '';
          try {
            var r = c.fn(window.NetAPI);
            ok = !!(r && r.ok !== undefined ? r.ok : r);
            note = (r && r.note) || '';
          } catch (e) { ok = false; note = String(e.message || e); }
          return { ok: ok, label: c.label, note: ok ? '' : (note || c.note || '') };
        });
      }
    });

    window.__solve = function (i) {
      var t = window.NET_TASKS[i];
      if (t.apply) t.apply(state.topo, window.NetAPI);
      renderTopology();
      renderPing(null);
    };
    window.__net = { state: state, api: window.NetAPI };
  });
})(typeof window !== 'undefined' ? window : globalThis);
