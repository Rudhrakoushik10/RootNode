$ports = @(3000, 3001, 4000, 5173)
$cleaned = 0

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            try {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host "Killed PID $procId on port $port"
                $cleaned++
            } catch {
                Write-Host "Could not kill PID $procId on port $port"
            }
        }
    } else {
        Write-Host "Port $port is free"
    }
}

if ($cleaned -eq 0) {
    Write-Host "`nAll ports are free"
} else {
    Write-Host "`nCleaned $cleaned processes"
}
