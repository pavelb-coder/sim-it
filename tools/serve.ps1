# Мини-сервер для Windows без Python: статика из корня репозитория.
#
# Сделан на TcpListener, а не на HttpListener: HttpListener требует прав
# администратора на префикс http://localhost:PORT/ и часто падает с
# «Доступ запрещён». TcpListener работает от обычного пользователя,
# слушает сразу IPv4 и IPv6, поэтому и localhost, и 127.0.0.1 открываются.
#
# Запуск:  powershell -NoProfile -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8087
param(
    [int]$Port = 8087,
    [switch]$NoOpen,
    [switch]$Check
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path

$index = Join-Path $Root "index.html"
if (-not (Test-Path $index)) {
    Write-Host "Нет index.html в корне репозитория — соберите сайт: python3 build_site.py"
    exit 1
}

$types = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".md"   = "text/plain; charset=utf-8"
    ".txt"  = "text/plain; charset=utf-8"
    ".zip"  = "application/zip"
}

function Test-PortFree {
    param([int]$Port)
    try {
        $l = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any), $Port
        $l.Start()
        $l.Stop()
        return $true
    } catch { return $false }
}

function Probe-Url {
    param([string]$Url)
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Proxy = $null          # мимо системного прокси
        $null = $wc.DownloadString($Url)
        return "отвечает"
    } catch {
        return ("не отвечает: " + $_.Exception.Message.Split("`n")[0].Trim())
    }
}

if ($Check) {
    Write-Host "Проверка окружения для локального сервера (PowerShell)"
    Write-Host "============================================================"
    Write-Host ("  PowerShell:    " + $PSVersionTable.PSVersion.ToString())
    Write-Host ("  папка сайта:   " + $Root)
    Write-Host ("  index.html:    " + (Test-Path (Join-Path $Root "index.html")))

    $localNames = ""
    try {
        $localNames = ([System.Net.Dns]::GetHostAddresses("localhost") |
            ForEach-Object { $_.IPAddressToString }) -join ", "
    } catch {
        $localNames = "не разрешается"
    }
    Write-Host ("  localhost ->   " + $localNames)

    if (Test-PortFree $Port) {
        $portState = "свободен"
    } else {
        $portState = "занят другим процессом — сервер возьмёт следующий"
    }
    Write-Host ("  порт " + $Port + ":       " + $portState)

    $proxyNote = "не задан"
    try {
        $proxy = [System.Net.WebRequest]::DefaultWebProxy
        if ($proxy) {
            $probe = [Uri]("http://127.0.0.1:" + $Port + "/")
            if ($proxy.IsBypassed($probe)) {
                $proxyNote = "localhost в исключениях — хорошо"
            } else {
                $proxyNote = "localhost идёт через прокси — добавьте его в исключения"
            }
        }
    } catch {
        $proxyNote = "не удалось определить"
    }
    Write-Host ("  прокси:        " + $proxyNote)

    Write-Host ""
    Write-Host "Адреса (имеет смысл, когда сервер уже запущен):"
    $urls = @("http://localhost:$Port/", "http://127.0.0.1:$Port/")
    foreach ($url in $urls) {
        Write-Host ("  " + $url.PadRight(28) + (Probe-Url $url))
    }
    Write-Host ""
    Write-Host "Если все адреса молчат — сервер не запущен или слушает другой порт."
    Write-Host "Тренажёры работают и без сервера: откройте index.html из этой папки."
    exit 0
}

function Start-Listener {
    param([int]$Port)
    # Сначала пробуем двойной стек: [::] с отключённым IPv6Only = IPv4 + IPv6.
    try {
        $l = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::IPv6Any), $Port
        $l.Server.SetSocketOption(
            [System.Net.Sockets.SocketOptionLevel]::IPv6,
            [System.Net.Sockets.SocketOptionName]::IPv6Only,
            $false)
        $l.Start()
        return @{ Listener = $l; Stack = "ipv4+ipv6" }
    } catch {
        try {
            $l = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any), $Port
            $l.Start()
            return @{ Listener = $l; Stack = "ipv4" }
        } catch {
            return $null
        }
    }
}

$port = $Port
$started = $null
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    $started = Start-Listener -Port $port
    if ($started) { break }
    Write-Host "Порт $port занят, пробую $($port + 1)…"
    $port++
}

if (-not $started) {
    Write-Host "Не удалось занять порт рядом с $Port. Попробуйте: .\start.bat 8090"
    exit 1
}

$listener = $started.Listener
$url = "http://localhost:$port/"

Write-Host "============================================================"
Write-Host "  Тренажёры IT-квантума · локальный сервер (PowerShell)"
Write-Host "  папка: $Root"
Write-Host "  слушает: $($started.Stack), порт $port"
Write-Host "  открыть: $url"
Write-Host "  запасной: http://127.0.0.1:$port/"
try {
    $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object {
            $_.AddressFamily -eq 'InterNetwork' -and
            -not $_.ToString().StartsWith("127.") -and
            -not $_.ToString().StartsWith("169.254.")
        }
    foreach ($ip in $ips) { Write-Host "  в локальной сети: http://$ip`:$port/" }
} catch { }
Write-Host "  остановить: Ctrl+C в этом окне"
Write-Host "  (тот же сайт открывается и без сервера: index.html в папке)"
Write-Host "============================================================"
if (-not $NoOpen) { Start-Process $url | Out-Null }

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $client.ReceiveTimeout = 5000
        $stream = $client.GetStream()
        $buffer = New-Object byte[] 8192
        $read = $stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) { $client.Close(); continue }

        $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
        $line = ($request -split "`r`n")[0]
        $parts = $line -split " "
        $method = if ($parts.Length -gt 0) { $parts[0] } else { "GET" }
        $rawPath = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
        $rawPath = ($rawPath -split "\?")[0]
        $rel = [System.Uri]::UnescapeDataString($rawPath).TrimStart("/")
        if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
        # Разделитель путей берём у системы: на Windows это "\", на Linux "/".
        $rel = $rel -replace "/", [System.IO.Path]::DirectorySeparatorChar
        $path = Join-Path $Root $rel

        if ((Test-Path $path -PathType Container)) { $path = Join-Path $path "index.html" }

        if ($method -ne "GET" -and $method -ne "HEAD") {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("405 — поддерживается только GET")
            $head = "HTTP/1.1 405 Method Not Allowed`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
            $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
            $stream.Write($hb, 0, $hb.Length)
            $stream.Write($bytes, 0, $bytes.Length)
            Write-Host "  405 $rel"
        } elseif (Test-Path $path -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($path)
            $ext = [System.IO.Path]::GetExtension($path).ToLower()
            $ctype = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
            $head = "HTTP/1.1 200 OK`r`nContent-Type: $ctype`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
            $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
            $stream.Write($hb, 0, $hb.Length)
            $stream.Write($bytes, 0, $bytes.Length)
            Write-Host "  200 $rel"
        } else {
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 — файл не найден: $rel")
            $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($msg.Length)`r`nConnection: close`r`n`r`n"
            $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
            $stream.Write($hb, 0, $hb.Length)
            $stream.Write($msg, 0, $msg.Length)
            Write-Host "  404 $rel"
        }
        $stream.Flush()
    } catch {
        # Оборванное соединение — не повод падать.
    } finally {
        try { $client.Close() } catch { }
    }
}
