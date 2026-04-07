$conn = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($conn -and $conn.OwningProcess) {
    Stop-Process -Id $conn.OwningProcess -Force
    Write-Host "Killed process on port 3001"
} else {
    Write-Host "No process on port 3001"
}

$conn2 = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($conn2 -and $conn2.OwningProcess) {
    Stop-Process -Id $conn2.OwningProcess -Force
    Write-Host "Killed process on port 4000"
} else {
    Write-Host "No process on port 4000"
}