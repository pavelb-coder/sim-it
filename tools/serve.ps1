# Мини-сервер для Windows без Python: статика из корня репозитория на порту 8087.
param([int]$Port = 8087)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch {
  Write-Host "Не удалось открыть порт $Port (он занят?). Попробуйте: .\start.bat 8090"
  exit 1
}

$url = "http://localhost:$Port/"
$types = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"; ".json" = "application/json; charset=utf-8"
  ".svg" = "image/svg+xml"; ".png" = "image/png"; ".ico" = "image/x-icon"
  ".md" = "text/plain; charset=utf-8"; ".txt" = "text/plain; charset=utf-8"
}

Write-Host "============================================================"
Write-Host "  Python-класс · тренажёр IT-квантума"
Write-Host "  открыть: $url"
Write-Host "  остановить: Ctrl+C в этом окне"
Write-Host "============================================================"
Start-Process $url

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
    $path = Join-Path $Root $rel
    if (Test-Path $path -PathType Container) { $path = Join-Path $path "index.html" }
    if (Test-Path $path -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      if ($types.ContainsKey($ext)) { $res.ContentType = $types[$ext] }
      else { $res.ContentType = "application/octet-stream" }
      $res.Headers.Add("Cache-Control", "no-store")
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host ("  200 " + $rel)
    } else {
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - файл не найден: $rel")
      $res.StatusCode = 404
      $res.ContentType = "text/plain; charset=utf-8"
      $res.OutputStream.Write($msg, 0, $msg.Length)
      Write-Host ("  404 " + $rel)
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.OutputStream.Close()
  }
}
