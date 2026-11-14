#!/usr/bin/env python3
"""Локальный сервер тренажёра IT-квантума.

Запускает статику из корня репозитория на порту 8087 (по умолчанию)
и открывает браузер. Работает на Windows, Ubuntu и macOS, нужен только Python 3.8+.

    python3 tools/serve.py            # порт 8087, открыть браузер
    python3 tools/serve.py 9000       # другой порт
    python3 tools/serve.py --no-open  # не открывать браузер
    python3 tools/serve.py --host 127.0.0.1   # только этот компьютер
"""
import argparse
import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path

DEFAULT_PORT = 8087
ROOT = Path(__file__).resolve().parent.parent
CHARSET_TYPES = ('.html', '.css', '.js', '.json', '.md', '.svg', '.txt')


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
        sys.stdout.write('  %s\n' % (fmt % args))
        sys.stdout.flush()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def local_ips():
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith('127.'):
                ips.add(ip)
    except OSError:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))  # маршрут не используется, только адрес
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    return sorted(ips)


def free_port(start):
    port = start
    for _ in range(50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(('0.0.0.0', port))
                return port
            except OSError:
                print(f'Порт {port} занят, пробую {port + 1}…')
                port += 1
    raise SystemExit(f'Не удалось найти свободный порт около {start}')


def main():
    ap = argparse.ArgumentParser(description='Сервер тренажёра IT-квантума')
    ap.add_argument('port', nargs='?', type=int, default=DEFAULT_PORT,
                    help=f'порт (по умолчанию {DEFAULT_PORT})')
    ap.add_argument('--host', default='0.0.0.0',
                    help='адрес прослушивания (0.0.0.0 — доступно в локальной сети класса)')
    ap.add_argument('--no-open', action='store_true', help='не открывать браузер')
    args = ap.parse_args()

    index = ROOT / 'index.html'
    if not index.exists():
        raise SystemExit('Нет index.html в корне репозитория. Соберите тренажёр: python3 python-class/build.py')

    port = free_port(args.port)
    url = f'http://localhost:{port}/'

    print('=' * 58)
    print('  Python-класс · тренажёр IT-квантума')
    print(f'  папка: {ROOT}')
    print(f'  открыть: {url}')
    ips = local_ips()
    if args.host == '0.0.0.0' and ips:
        for ip in ips:
            print(f'  в локальной сети: http://{ip}:{port}/')
    print('  остановить: Ctrl+C')
    print('=' * 58, flush=True)

    with Server((args.host, port), Handler) as httpd:
        if not args.no_open:
            threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nСервер остановлен.')


if __name__ == '__main__':
    try:
        main()
    except OSError as e:
        print(f'Ошибка: {e}', file=sys.stderr)
        sys.exit(1)
