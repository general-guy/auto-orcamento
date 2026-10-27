# Mede tempo de download dos assets principais da UI (mesma origem).
# Uso: pwsh ./scripts/bench_web_load.ps1 -BaseUrl https://axis.tail5fe4b7.ts.net:3000/
#      pwsh ./scripts/bench_web_load.ps1 -BaseUrl http://127.0.0.1:3000/

param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl
)

$BaseUrl = $BaseUrl.TrimEnd('/')
$paths = @(
    '/',
    '/styles.css',
    '/api.js',
    '/app.js',
    '/assets/papel-timbrado.png'
)

$results = foreach ($path in $paths) {
    $url = "$BaseUrl$path"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 120
        $sw.Stop()
        [pscustomobject]@{
            Path = $path
            Status = $resp.StatusCode
            Ms = [math]::Round($sw.Elapsed.TotalMilliseconds)
            KB = [math]::Round(($resp.RawContentLength) / 1024, 1)
        }
    }
    catch {
        $sw.Stop()
        [pscustomobject]@{
            Path = $path
            Status = 'ERR'
            Ms = [math]::Round($sw.Elapsed.TotalMilliseconds)
            KB = $null
            Error = $_.Exception.Message
        }
    }
}

Write-Output ""
Write-Output "Base: $BaseUrl"
$results | Format-Table -AutoSize
$totalMs = ($results | Where-Object { $_.Status -ne 'ERR' } | Measure-Object -Property Ms -Sum).Sum
Write-Output "Soma sequencial (aprox. waterfall defer): $totalMs ms"
Write-Output "Nota: waitForBackend removido — antes havia ~5000 ms artificiais em HTTPS (porta != 3000)."
