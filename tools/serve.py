#!/usr/bin/env python3
"""Локальный сервер тренажёра IT-квантума.

Запускает статику из корня репозитория и открывает браузер. Работает на Windows,
Ubuntu и macOS, нужен только Python 3.8+.

    python3 tools/serve.py                 # порт 8087, открыть браузер
    python3 tools/serve.py 9000            # другой порт
    python3 tools/serve.py --port 9000     # то же самое
    python3 tools/serve.py --no-open       # не открывать браузер
    python3 tools/serve.py --host 127.0.0.1   # только этот компьютер
    python3 tools/serve.py --check         # проверить, почему localhost не открывается

Важное про localhost:

* сервер слушает и IPv4, и IPv6 (двойной стек), поэтому `localhost` работает, даже
  если в системе это имя сначала разрешается в `::1`;
* перед открытием браузера сервер сам проверяет адреса `localhost`, `127.0.0.1`
  и `[::1]` и открывает тот, который реально отвечает;
* если ничего не отвечает — печатается причина и подсказка (порт, прокси, VPN).
"""
import argparse
import http.server
import socket
import socketserver
import sys
import threading
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

DEFAULT_PORT = 8087
ROOT = Path(__file__).resolve().parent.parent
CHARSET_TYPES = ('.html', '.css', '.js', '.json', '.md', '.svg', '.txt')
PROXY_VARS = ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
              'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy')


PROBING = threading.Event()   # во время самопроверки не засоряем журнал


class Handler(http.server.SimpleHTTPRequestHandler):
    """Статика с UTF-8 по умолчанию и без кэша, чтобы правки были видны сразу."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def guess_type(self, path):
        mime = super().guess_type(path)
        if mime.startswith('text/') and 'charset' not in mime:
            mime += '; charset=utf-8'
        return mime

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def log_message(self, fmt, *args):
        if PROBING.is_set():
            return
        sys.stdout.write('  %s\n' % (fmt % args))
        sys.stdout.flush()


class ThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


class ThreadingServer6(ThreadingServer):
    address_family = socket.AF_INET6


def start_server(host, port):
    """Поднять сервер. При host=0.0.0.0 слушаем сразу IPv4 и IPv6 (двойной стек)."""
    if host in ('0.0.0.0', '::', 'localhost', ''):
        if socket.has_ipv6:
            try:
                server = ThreadingServer6(('::', port), Handler, bind_and_activate=False)
                try:
                    server.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
                except OSError:
                    pass
                server.server_bind()
                server.server_activate()
                return server, 'ipv4+ipv6'
            except OSError:
                pass
        return ThreadingServer(('0.0.0.0', port), Handler), 'ipv4'
    if ':' in host and socket.has_ipv6:
        return ThreadingServer6((host, port), Handler), 'ipv6'
    return ThreadingServer((host, port), Handler), 'ipv4'


def local_ips():
    """Адреса этого компьютера в локальной сети (для планшетов в классе)."""
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith('127.'):
                ips.add(ip)
    except OSError:
        pass
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(('8.8.8.8', 80))  # маршрут не используется, только адрес
        ips.add(sock.getsockname()[0])
        sock.close()
    except OSError:
        pass
    return sorted(ip for ip in ips if not ip.startswith('169.254.'))


def port_is_free(port, host='0.0.0.0'):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
            return True
        except OSError:
            return False


def free_port(start):
    port = start
    for _ in range(50):
        if port_is_free(port):
            return port
        print(f'Порт {port} занят, пробую {port + 1}…')
        port += 1
    raise SystemExit(f'Не удалось найти свободный порт около {start}')


def probe(url, timeout=2.0):
    """Проверить адрес своим же HTTP-запросом, минуя системный прокси."""
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(url, timeout=timeout) as response:
            return 200 <= getattr(response, 'status', response.getcode()) < 400
    except (urllib.error.URLError, OSError, ValueError):
        return False


def check_hosts(port):
    """Опрос адресов: что реально отвечает на этом порту."""
    candidates = [
        ('localhost', f'http://localhost:{port}/'),
        ('127.0.0.1', f'http://127.0.0.1:{port}/'),
        ('::1', f'http://[::1]:{port}/'),
    ]
    results = []
    PROBING.set()
    try:
        for name, url in candidates:
            results.append((name, url, probe(url, timeout=1.5)))
    finally:
        PROBING.clear()
    return results


def resolve(name):
    try:
        infos = socket.getaddrinfo(name, None)
        return sorted({info[4][0] for info in infos})
    except OSError as exc:
        return [f'не разрешается: {exc}']


def proxy_vars():
    return {key: __import__('os').environ[key] for key in PROXY_VARS if __import__('os').environ.get(key)}


def diagnostics(port):
    """Режим --check: объяснить, что мешает открыть localhost."""
    print('Проверка окружения для локального сервера')
    print('=' * 58)
    print(f'  python:       {sys.version.split()[0]} ({sys.executable})')
    print(f'  папка сайта:  {ROOT}')
    print(f'  index.html:   {"есть" if (ROOT / "index.html").exists() else "НЕТ — соберите: python3 build_site.py"}')
    print(f'  IPv6 в системе: {"есть" if socket.has_ipv6 else "нет"}')
    print(f'  localhost →   {", ".join(resolve("localhost"))}')
    print(f'  порт {port}:     {"свободен" if port_is_free(port) else "занят другим процессом"}')
    for extra in range(port + 1, port + 5):
        if port_is_free(extra):
            print(f'  свободный порт рядом: {extra}')
            break

    proxies = proxy_vars()
    if proxies:
        print('  прокси в окружении: ' + ', '.join(f'{k}={v}' for k, v in proxies.items()))
        print('    → браузер может гнать localhost через прокси. Добавьте localhost и 127.0.0.1 в исключения.')
    else:
        print('  прокси в окружении: нет')

    print()
    print('Если сервер сейчас запущен, проверьте адреса вручную:')
    for name, url, ok in check_hosts(port):
        print(f'  {name:<12} {url:<28} {"отвечает" if ok else "не отвечает"}')
    print()
    print('Ответ «не отвечает» на все три адреса обычно значит, что сервер не запущен')
    print('или слушает другой порт — посмотрите строку «открыть:» в его окне.')
    print('Запуск: start.bat (Windows) или ./start.sh (Linux/macOS)')
    return 0


def main():
    parser = argparse.ArgumentParser(description='Сервер тренажёра IT-квантума')
    parser.add_argument('port', nargs='?', type=int, default=DEFAULT_PORT,
                        help=f'порт (по умолчанию {DEFAULT_PORT})')
    parser.add_argument('--port', dest='port_opt', type=int,
                        help='то же, что позиционный порт (для совместимости с документацией)')
    parser.add_argument('--host', default='0.0.0.0',
                        help='адрес прослушивания (0.0.0.0 — этот компьютер и локальная сеть)')
    parser.add_argument('--no-open', action='store_true', help='не открывать браузер')
    parser.add_argument('--check', action='store_true', help='проверить, почему localhost не открывается')
    args = parser.parse_args()

    port = args.port_opt or args.port

    if args.check:
        return diagnostics(port)

    if not (ROOT / 'index.html').exists():
        raise SystemExit('Нет index.html в корне репозитория. Соберите сайт: python3 build_site.py')

    port = free_port(port)
    server, stack = start_server(args.host, port)
    threading.Thread(target=server.serve_forever, daemon=True).start()

    hosts = check_hosts(port)
    working = [url for _, url, ok in hosts if ok]
    loopback_only = args.host not in ('0.0.0.0', '::', 'localhost', '')

    # Если сервер слушает только loopback, «localhost» может вести в другое место —
    # тогда первым печатаем именно IP, который слушается.
    if loopback_only:
        exact = [url for url in working if args.host.replace('::', '[::]') in url]
        others = [url for url in working if url not in exact]
        working = exact + others

    url = working[0] if working else f'http://127.0.0.1:{port}/'
    backup = [item for item in working[1:] if item != url]

    print('=' * 58)
    print('  Тренажёры IT-квантума · локальный сервер')
    print(f'  папка: {ROOT}')
    print(f'  слушает: {stack}, порт {port}')
    print(f'  открыть: {url}')
    if backup:
        print('  запасные адреса: ' + ', '.join(backup))
    if not loopback_only:
        for ip in local_ips():
            print(f'  в локальной сети: http://{ip}:{port}/')
    if not working:
        print()
        print('  ВНИМАНИЕ: ни localhost, ни 127.0.0.1 не ответили.')
        print('  Откройте адрес вручную; если и он не открывается —')
        print('  запустите диагностику: python3 tools/serve.py --check')
    proxies = proxy_vars()
    if proxies:
        print()
        print('  Прокси в окружении: ' + ', '.join(proxies))
        print('  Добавьте localhost и 127.0.0.1 в исключения прокси, иначе браузер')
        print('  будет искать сервер не на вашем компьютере.')
    print('  остановить: Ctrl+C')
    print('=' * 58, flush=True)

    if not args.no_open:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    try:
        while True:
            threading.Event().wait(0.5)
    except KeyboardInterrupt:
        print('\nСервер остановлен.')
    finally:
        server.shutdown()
        server.server_close()
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except OSError as exc:
        print(f'Ошибка: {exc}', file=sys.stderr)
        print('Подсказка: другой порт — ./start.sh 8090', file=sys.stderr)
        sys.exit(1)
