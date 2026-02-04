$data = Invoke-RestMethod -Uri 'http://localhost:3000/api/proof-stats'

Write-Host "`n=== OVERALL SUMMARY ===" -ForegroundColor Cyan
Write-Host "Total Signals: $($data.summary.totalSignals)"
Write-Host "Completed: $($data.summary.completedSignals)"
Write-Host "Wins: $($data.summary.wins)"
Write-Host "Losses: $($data.summary.losses)"
Write-Host "Win Rate: $($data.summary.overallWinRate)%"
Write-Host "Total R: $($data.summary.totalR)"

Write-Host "`n=== PROFIT ANALYSIS (Last 20 trades) ===" -ForegroundColor Cyan

$wins = @()
$losses = @()

foreach ($trade in $data.recentOutcomes) {
    if ($trade.outcome -eq 'WON') {
        $wins += $trade.profit_pct
    } else {
        $losses += [Math]::Abs($trade.profit_pct)
    }
}

$avgWin = if ($wins.Count -gt 0) { ($wins | Measure-Object -Average).Average } else { 0 }
$avgLoss = if ($losses.Count -gt 0) { ($losses | Measure-Object -Average).Average } else { 0 }

Write-Host "Win Count: $($wins.Count)"
Write-Host "Loss Count: $($losses.Count)"
Write-Host "Average Win: $([Math]::Round($avgWin, 2))%"
Write-Host "Average Loss: $([Math]::Round($avgLoss, 2))%"

Write-Host "`n=== EXIT REASONS ===" -ForegroundColor Cyan
$data.recentOutcomes | Group-Object exit_reason | ForEach-Object {
    Write-Host "$($_.Name): $($_.Count)"
}

Write-Host "`n=== INDIVIDUAL TRADES ===" -ForegroundColor Cyan
foreach ($trade in $data.recentOutcomes) {
    $color = if ($trade.outcome -eq 'WON') { 'Green' } else { 'Red' }
    $pct = [Math]::Round($trade.profit_pct, 2)
    Write-Host "$($trade.coin) | $($trade.direction) | Score:$($trade.score) | $($pct)% | $($trade.outcome) | $($trade.exit_reason)" -ForegroundColor $color
}
