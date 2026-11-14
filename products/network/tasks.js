/* ==========================================================================
   Симулятор сети — задачи. Проверки запускают настоящий ping по модели.
   ========================================================================== */
(function (global) {
  'use strict';

  function pc(id, name, ip, mask, gw) {
    return { id: id, name: name, type: 'pc', ip: ip || '', mask: mask || '/24', gw: gw || '' };
  }
  function sw(id, name) { return { id: id, name: name, type: 'switch' }; }
  function router(id, name, ifaces, routes) {
    return { id: id, name: name, type: 'router', ifaces: ifaces || [], routes: routes || [] };
  }
  function topo(devices, links) { return { devices: devices, links: links }; }

  global.NET_TASKS = [
    {
      id: 'n1',
      level: 'легко',
      title: 'Соседи по коммутатору',
      subtitle: 'адресация в одной подсети',
      theory: '<p>Два компьютера, соединённые коммутатором, — это <b>один L2-сегмент</b>. Чтобы они видели друг друга, ' +
              'их адреса должны быть в одной подсети, то есть совпадать по первым 24 битам при маске /24.</p>' +
              '<p>Адрес сети 192.168.10.0/24 — значит подходят адреса 192.168.10.1 … 192.168.10.254.</p>',
      prompt: 'Задай PC1 и PC2 адреса из сети <code>192.168.10.0/24</code> так, чтобы <code>ping</code> между ними прошёл. ' +
              'Шлюз здесь не нужен — сеть одна.',
      examples: [{ label: 'как проверить', text: 'выбери PC1 → PC2 и нажми «Пинговать»' }],
      hint: 'Например PC1 — 192.168.10.1, PC2 — 192.168.10.2, маска у обоих /24.',
      topology: topo([pc('pc1', 'PC1'), sw('sw1', 'SW1'), pc('pc2', 'PC2')],
        [['pc1', 'sw1'], ['sw1', 'pc2']]),
      apply: function (topo) {
        topo.devices[0].ip = '192.168.10.1';
        topo.devices[2].ip = '192.168.10.2';
      },
      checks: [
        {
          label: 'у PC1 адрес из сети 192.168.10.0/24',
          fn: function (api) {
            var f = api.iface('PC1');
            return !!f && api.sameSubnet(f.ip, '192.168.10.1', '/24') && f.mask === '/24';
          }
        },
        {
          label: 'у PC2 адрес из сети 192.168.10.0/24',
          fn: function (api) {
            var f = api.iface('PC2');
            return !!f && api.sameSubnet(f.ip, '192.168.10.1', '/24') && f.mask === '/24';
          }
        },
        { label: 'ping PC1 → PC2 проходит', fn: function (api) { return api.ping('PC1', 'PC2').ok; } },
        { label: 'ping PC2 → PC1 проходит', fn: function (api) { return api.ping('PC2', 'PC1').ok; } }
      ]
    },
    {
      id: 'n2',
      level: 'легко',
      title: 'Маска решает',
      subtitle: 'адреса выглядят похоже, но подсети разные',
      theory: '<p>Адрес 192.168.5.10 и 192.168.6.10 отличаются в третьем октете. При маске <code>/24</code> это ' +
              '<b>разные сети</b>: 192.168.5.0/24 и 192.168.6.0/24.</p>' +
              '<p>Чтобы объединить их без маршрутизатора, нужен адрес из той же сети. Маска /16 объединила бы обе, ' +
              'но в школьной практике почти всегда приводят адреса к одной /24.</p>',
      prompt: 'Компьютеры подключены к одному коммутатору, но ping не проходит. Разберись почему и исправь адресацию: ' +
              'приведи оба адреса к сети <code>192.168.5.0/24</code>.',
      examples: [{ label: 'сейчас', text: 'PC1 192.168.5.10/24 · PC2 192.168.6.10/24' }],
      hint: 'Поменяй у PC2 третий октет: 192.168.6.10 → 192.168.5.11 (главное — не занять адрес PC1).',
      topology: topo([pc('pc1', 'PC1', '192.168.5.10', '/24'), sw('sw1', 'SW1'), pc('pc2', 'PC2', '192.168.6.10', '/24')],
        [['pc1', 'sw1'], ['sw1', 'pc2']]),
      apply: function (topo) { topo.devices[2].ip = '192.168.5.11'; },
      checks: [
        {
          label: 'PC2 в сети 192.168.5.0/24',
          fn: function (api) {
            var f = api.iface('PC2');
            return !!f && api.sameSubnet(f.ip, '192.168.5.10', '/24');
          }
        },
        { label: 'адреса PC1 и PC2 не совпадают', fn: function (api) { return api.iface('PC1').ip !== api.iface('PC2').ip; } },
        { label: 'ping PC1 → PC2 проходит', fn: function (api) { return api.ping('PC1', 'PC2').ok; } }
      ]
    },
    {
      id: 'n3',
      level: 'средне',
      title: 'Шлюз по умолчанию',
      subtitle: 'выход из своей подсети',
      theory: '<p>Если адрес цели в другой подсети, компьютер не может отправить пакет напрямую: он отдаёт его ' +
              '<b>шлюзу по умолчанию</b> — ближайшему интерфейсу маршрутизатора.</p>' +
              '<p>Шлюз обязан быть в <b>своей</b> подсети, иначе до него не добраться.</p>',
      prompt: 'PC1 и PC2 в разных подсетях, между ними маршрутизатор R1. Задай PC1 и PC2 шлюзы так, ' +
              'чтобы ping прошёл в обе стороны.',
      examples: [{ label: 'топология', text: 'PC1 10.0.0.10/24 — R1 (10.0.0.1/24, 192.168.1.1/24) — PC2 192.168.1.20/24' }],
      hint: 'Шлюз PC1 — 10.0.0.1, шлюз PC2 — 192.168.1.1.',
      topology: topo([
        pc('pc1', 'PC1', '10.0.0.10', '/24'),
        sw('sw1', 'SW1'),
        router('r1', 'R1', [{ name: 'G0/0', ip: '10.0.0.1', mask: '/24' }, { name: 'G0/1', ip: '192.168.1.1', mask: '/24' }]),
        sw('sw2', 'SW2'),
        pc('pc2', 'PC2', '192.168.1.20', '/24')
      ], [['pc1', 'sw1'], ['sw1', 'r1'], ['r1', 'sw2'], ['sw2', 'pc2']]),
      apply: function (topo) {
        topo.devices[0].gw = '10.0.0.1';
        topo.devices[4].gw = '192.168.1.1';
      },
      checks: [
        { label: 'у PC1 шлюз 10.0.0.1', fn: function (api) { return api.dev('PC1').gw === '10.0.0.1'; } },
        { label: 'у PC2 шлюз 192.168.1.1', fn: function (api) { return api.dev('PC2').gw === '192.168.1.1'; } },
        { label: 'ping PC1 → PC2 проходит', fn: function (api) { return api.ping('PC1', 'PC2').ok; } },
        { label: 'ping PC2 → PC1 проходит', fn: function (api) { return api.ping('PC2', 'PC1').ok; } }
      ]
    },
    {
      id: 'n4',
      level: 'сложно',
      title: 'Два маршрутизатора',
      subtitle: 'статические маршруты в обе стороны',
      theory: '<p>Когда между сетями два маршрутизатора, каждому нужно знать про «чужую» сеть. ' +
              'Запись <code>сеть/маска через адрес</code> — это статический маршрут.</p>' +
              '<p>Маршрут нужен <b>в обе стороны</b>: иначе ответ не вернётся, и ping будет «теряться».</p>',
      prompt: 'Два маршрутизатора соединены между собой. Настрой R1 и R2 так, чтобы PC1 (10.0.0.10) видел PC2 (192.168.1.10). ' +
              'Нужны два статических маршрута — по одному на каждом роутере.',
      examples: [{ label: 'топология', text: 'PC1 — R1 (10.0.0.1 | 172.16.0.1) — R2 (172.16.0.2 | 192.168.1.1) — PC2' }],
      hint: 'На R1: маршрут 192.168.1.0/24 через 172.16.0.2. На R2: 10.0.0.0/24 через 172.16.0.1.',
      topology: topo([
        pc('pc1', 'PC1', '10.0.0.10', '/24', '10.0.0.1'),
        sw('sw1', 'SW1'),
        router('r1', 'R1', [{ name: 'G0/0', ip: '10.0.0.1', mask: '/24' }, { name: 'G0/1', ip: '172.16.0.1', mask: '/24' }],
          [{ dest: '', mask: '/24', via: '' }]),
        router('r2', 'R2', [{ name: 'G0/0', ip: '172.16.0.2', mask: '/24' }, { name: 'G0/1', ip: '192.168.1.1', mask: '/24' }],
          [{ dest: '', mask: '/24', via: '' }]),
        sw('sw2', 'SW2'),
        pc('pc2', 'PC2', '192.168.1.10', '/24', '192.168.1.1')
      ], [['pc1', 'sw1'], ['sw1', 'r1'], ['r1', 'r2'], ['r2', 'sw2'], ['sw2', 'pc2']]),
      apply: function (topo) {
        topo.devices[2].routes = [{ dest: '192.168.1.0', mask: '/24', via: '172.16.0.2' }];
        topo.devices[3].routes = [{ dest: '10.0.0.0', mask: '/24', via: '172.16.0.1' }];
      },
      checks: [
        {
          label: 'у R1 есть маршрут до 192.168.1.0/24 через 172.16.0.2',
          fn: function (api) {
            return api.routes('R1').some(function (r) {
              return r.dest === '192.168.1.0' && r.mask === '/24' && r.via === '172.16.0.2';
            });
          }
        },
        {
          label: 'у R2 есть маршрут до 10.0.0.0/24 через 172.16.0.1',
          fn: function (api) {
            return api.routes('R2').some(function (r) {
              return r.dest === '10.0.0.0' && r.mask === '/24' && r.via === '172.16.0.1';
            });
          }
        },
        { label: 'ping PC1 → PC2 проходит', fn: function (api) { return api.ping('PC1', 'PC2').ok; } },
        { label: 'ping PC2 → PC1 проходит', fn: function (api) { return api.ping('PC2', 'PC1').ok; } }
      ]
    },
    {
      id: 'n5',
      level: 'средне',
      title: 'Шлюз из чужой сети',
      subtitle: 'типичная ошибка настройки',
      theory: '<p>Частая поломка: адрес шлюза указан правильно, но он не входит в подсеть компьютера. ' +
              'Например, PC 10.0.0.10/24 со шлюзом 10.0.1.1 — до такого шлюза пакет физически не дойдёт.</p>' +
              '<p>Диагностика: сравнить адрес компьютера и адрес шлюза по маске.</p>',
      prompt: 'Ping не проходит. Найди ошибку и исправь её: компьютер должен выходить в соседнюю сеть через R1.',
      examples: [{ label: 'сейчас', text: 'PC1 10.0.0.10/24, шлюз 10.0.1.1 · R1: 10.0.0.1/24 и 192.168.1.1/24' }],
      hint: 'Шлюз должен быть из сети 10.0.0.0/24 — это адрес 10.0.0.1.',
      topology: topo([
        pc('pc1', 'PC1', '10.0.0.10', '/24', '10.0.1.1'),
        sw('sw1', 'SW1'),
        router('r1', 'R1', [{ name: 'G0/0', ip: '10.0.0.1', mask: '/24' }, { name: 'G0/1', ip: '192.168.1.1', mask: '/24' }]),
        sw('sw2', 'SW2'),
        pc('pc2', 'PC2', '192.168.1.20', '/24', '192.168.1.1')
      ], [['pc1', 'sw1'], ['sw1', 'r1'], ['r1', 'sw2'], ['sw2', 'pc2']]),
      apply: function (topo) { topo.devices[0].gw = '10.0.0.1'; },
      checks: [
        {
          label: 'шлюз PC1 находится в его подсети',
          fn: function (api) {
            var d = api.dev('PC1');
            return api.sameSubnet(d.ip, d.gw, d.mask);
          }
        },
        { label: 'ping PC1 → PC2 проходит', fn: function (api) { return api.ping('PC1', 'PC2').ok; } },
        { label: 'ping PC2 → PC1 проходит', fn: function (api) { return api.ping('PC2', 'PC1').ok; } }
      ]
    },
    {
      id: 'n6',
      level: 'сложно',
      title: 'Три сети, один роутер',
      subtitle: 'несколько интерфейсов и адрес сети',
      theory: '<p>У маршрутизатора может быть много интерфейсов — по одному на каждую сеть. Сети, подключённые ' +
              'напрямую, в маршрутах не нуждаются: роутер про них и так знает.</p>' +
              '<p>Проверь, что адреса не пересекаются и что каждый шлюз из своей подсети.</p>',
      prompt: 'К R1 подключены три сети. Задай адрес третьему интерфейсу (сеть <code>172.20.0.0/24</code>) и шлюзы ' +
              'PC1 и PC3, чтобы все три компьютера видели друг друга.',
      examples: [{ label: 'топология', text: 'PC1 10.1.0.10 — R1 (10.1.0.1, 192.168.50.1, ?/24) — PC2 192.168.50.10, PC3 172.20.0.30' }],
      hint: 'Интерфейсу — 172.20.0.1/24, шлюз PC1 — 10.1.0.1, шлюз PC3 — 172.20.0.1.',
      topology: topo([
        pc('pc1', 'PC1', '10.1.0.10', '/24', ''),
        sw('sw1', 'SW1'),
        pc('pc2', 'PC2', '192.168.50.10', '/24', ''),
        sw('sw2', 'SW2'),
        pc('pc3', 'PC3', '172.20.0.30', '/24', ''),
        sw('sw3', 'SW3'),
        router('r1', 'R1', [
          { name: 'G0/0', ip: '10.1.0.1', mask: '/24' },
          { name: 'G0/1', ip: '192.168.50.1', mask: '/24' },
          { name: 'G0/2', ip: '', mask: '/24' }
        ])
      ], [['pc1', 'sw1'], ['sw1', 'r1'], ['pc2', 'sw2'], ['sw2', 'r1'], ['pc3', 'sw3'], ['sw3', 'r1']]),
      apply: function (topo) {
        topo.devices[6].ifaces[2].ip = '172.20.0.1';
        topo.devices[0].gw = '10.1.0.1';
        topo.devices[2].gw = '192.168.50.1';
        topo.devices[4].gw = '172.20.0.1';
      },
      checks: [
        {
          label: 'третий интерфейс R1 — 172.20.0.1/24',
          fn: function (api) {
            var f = api.iface('R1', 2);
            return !!f && f.ip === '172.20.0.1' && f.mask === '/24';
          }
        },
        { label: 'шлюзы PC1, PC2 и PC3 заданы верно', fn: function (api) {
            return api.dev('PC1').gw === '10.1.0.1' && api.dev('PC2').gw === '192.168.50.1' && api.dev('PC3').gw === '172.20.0.1';
          } },
        { label: 'ping PC1 → PC2 проходит', fn: function (api) { return api.ping('PC1', 'PC2').ok; } },
        { label: 'ping PC1 → PC3 проходит', fn: function (api) { return api.ping('PC1', 'PC3').ok; } },
        { label: 'ping PC2 → PC3 проходит', fn: function (api) { return api.ping('PC2', 'PC3').ok; } }
      ]
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
