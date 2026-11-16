# Мини-сервер для Windows без Python: статика из корня репозитория.
#
# ВАЖНО: файл сохранён в UTF-8 С BOM (EF BB BF в начале). Без BOM
# Windows PowerShell 5.1 читает .ps1 как ANSI, кириллица рассыпается
# ("РѕРїСЂРµРґРµР»РёС‚СЊ") и скрипт не парсится.
#
# Сделан на TcpListener, а не на HttpListener: HttpListener требует прав
# администратора на префикс http://localhost:PORT/ и падает с «Доступ запрещён».
# TcpListener работает от обычного пользователя, слушает IPv4 и IPv6 сразу.
#
# Запуск:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8087
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\serve.ps1 -Check
param(
    [int]$Port = 8087,
    [switch]$NoOpen,
    [switch]$Check
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path

$index = Join-Path $Root "index.html"
if (-not (Test-Path $index)) {
    Write-Host "Нет index.html в корне папки: $Root"
    Write-Host "Соберите сайт: python3 build_site.py"
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
    param([int]$PortNumber)
    try {
        $probe = New-Object -TypeName System.Net.Sockets.TcpListener -ArgumentList @([System.Net.IPAddress]::Any, $PortNumber)
        $probe.Start()
        $probe.Stop()
        return $true
    } catch {
        return $false
    }
}

function Probe-Url {
    param([string]$Url)
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Proxy = $null
        $null = $wc.DownloadString($Url)
        return "отвечает"
    } catch {
        $message = $_.Exception.Message
        if ($message) {
            $firstLine = $message.Split("`n")[0].Trim()
        } else {
            $firstLine = "ошибка"
        }
        return ("не отвечает: " + $firstLine)
    }
}

function Start-Listener {
    param([int]$PortNumber)

    # Сначала двойной стек: [::] с отключённым IPv6Only = IPv4 + IPv6.
    try {
        $listener = New-Object -TypeName System.Net.Sockets.TcpListener -ArgumentList @([System.Net.IPAddress]::IPv6Any, $PortNumber)
        $listener.Server.SetSocketOption(
            [System.Net.Sockets.SocketOptionLevel]::IPv6,
            [System.Net.Sockets.SocketOptionName]::IPv6Only,
            $false)
        $listener.Start()
        return @{ Listener = $listener; Stack = "ipv4+ipv6" }
    } catch {
        # Если IPv6 недоступен — обычный IPv4.
        try {
            $listener = New-Object -TypeName System.Net.Sockets.TcpListener -ArgumentList @([System.Net.IPAddress]::Any, $PortNumber)
            $listener.Start()
            return @{ Listener = $listener; Stack = "ipv4" }
        } catch {
            return $null
        }
    }
}

if ($Check) {
    Write-Host "Проверка окружения для локального сервера (PowerShell)"
    Write-Host "============================================================"
    Write-Host ("  PowerShell:    " + $PSVersionTable.PSVersion.ToString())
    Write-Host ("  папка сайта:   " + $Root)
    Write-Host ("  net use:       " + (Get-Location).Path)
    Write-Host ("  index.html:    " + (Test-Path $index))

    $localNames = "не разрешается"
    try {
        $addresses = [System.Net.Dns]::GetHostAddresses("localhost")
        $parts = @()
        foreach ($address in $addresses) {
            $parts += $address.IPAddressToString
        }
        $localNames = $parts -join ", "
    } catch {
        $localNames = "не разрешается"
    }
    Write-Host ("  localhost ->   " + $localNames)

    if (Test-PortFree -PortNumber $Port) {
        $portState = "свободен"
    } else {
        $portState = "занят другим процессом — сервер возьмёт следующий"
    }
    Write-Host ("  порт " + $Port + ":       " + $portState)

    $proxyNote = "не задан"
    try {
        $proxy = [System.Net.WebRequest]::DefaultWebProxy
        if ($proxy) {
            $probeUri = [Uri]("http://127.0.0.1:" + $Port + "/")
            if ($proxy.IsBypassed($probeUri)) {
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
        Write-Host ("  " + $url.PadRight(28) + (Probe-Url -Url $url))
    }
    Write-Host ""
    Write-Host "Если все адреса молчат — сервер не запущен или слушает другой порт."
    Write-Host "Тренажёры работают и без сервера: откройте index.html из этой папки."
    exit 0
}

$currentPort = $Port
$started = $null
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    $started = Start-Listener -PortNumber $currentPort
    if ($started) { break }
    Write-Host ("Порт " + $currentPort + " занят, пробую " + ($currentPort + 1) + "…")
    $currentPort++
}

if (-not $started) {
    Write-Host ("Не удалось занять порт рядом с " + $Port + ". Попробуйте: start.bat 8090")
    exit 1
}

$listener = $started.Listener
$url = "http://localhost:$currentPort/"

Write-Host "============================================================"
Write-Host "  Тренажёры IT-квантума · локальный сервер (PowerShell)"
Write-Host "  папка: $Root"
Write-Host ("  слушает: " + $started.Stack + ", порт " + $currentPort)
Write-Host "  открыть: $url"
Write-Host ("  запасной: http://127.0.0.1:" + $currentPort + "/")
try {
    $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())
    foreach ($ip in $ips) {
        $text = $ip.ToString()
        if ($ip.AddressFamily -eq 'InterNetwork' -and -not $text.StartsWith("127.") -and -not $text.StartsWith("169.254.")) {
            Write-Host ("  в локальной сети: http://" + $text + ":" + $currentPort + "/")
        }
    }
} catch {
    # Сеть может быть недоступна — это не мешает работе на этом компьютере.
}
Write-Host "  остановить: Ctrl+C в этом окне"
Write-Host "  (тот же сайт открывается и без сервера: index.html в папке)"
Write-Host "============================================================"

if (-not $NoOpen) {
    Start-Process $url | Out-Null
}

$separator = [string][System.IO.Path]::DirectorySeparatorChar

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $client.ReceiveTimeout = 5000
        $stream = $client.GetStream()
        $buffer = New-Object byte[] 8192
        $read = $stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) {
            $client.Close()
            continue
        }

        $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
        $firstLine = ($request -split "`r`n")[0]
        $parts = $firstLine -split " "
        if ($parts.Length -gt 0) {
            $method = $parts[0]
        } else {
            $method = "GET"
        }
        if ($parts.Length -gt 1) {
            $rawPath = $parts[1]
        } else {
            $rawPath = "/"
        }

        $rawPath = ($rawPath -split "\?")[0]
        $rel = [System.Uri]::UnescapeDataString($rawPath).TrimStart("/")
        if ([string]::IsNullOrWhiteSpace($rel)) {
            $rel = "index.html"
        }
        $rel = $rel -replace "/", $separator
        $path = Join-Path $Root $rel

        if (Test-Path $path -PathType Container) {
            $path = Join-Path $path "index.html"
        }

        if ($method -ne "GET" -and $method -ne "HEAD") {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("405 — поддерживается только GET")
            $head = "HTTP/1.1 405 Method Not Allowed`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: " + $bytes.Length + "`r`nConnection: close`r`n`r`n"
            $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
            $stream.Write($headBytes, 0, $headBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
            Write-Host ("  405 " + $rel)
        } elseif (Test-Path $path -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($path)
            $ext = [System.IO.Path]::GetExtension($path).ToLower()
            if ($types.ContainsKey($ext)) {
                $ctype = $types[$ext]
            } else {
                $ctype = "application/octet-stream"
            }
            $head = "HTTP/1.1 200 OK`r`nContent-Type: " + $ctype + "`r`nContent-Length: " + $bytes.Length + "`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
            $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
            $stream.Write($headBytes, 0, $headBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
            Write-Host ("  200 " + $rel)
        } else {
            $message = [System.Text.Encoding]::UTF8.GetBytes("404 — файл не найден: " + $rel)
            $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: " + $message.Length + "`r`nConnection: close`r`n`r`n"
            $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
            $stream.Write($headBytes, 0, $headBytes.Length)
            $stream.Write($message, 0, $message.Length)
            Write-Host ("  404 " + $rel)
        }
        $stream.Flush()
    } catch {
        # Оборванное соединение не повод падать.
    } finally {
        try { $client.Close() } catch { }
    }
}
