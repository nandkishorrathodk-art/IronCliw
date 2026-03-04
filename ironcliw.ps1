param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$ArgsList
)
if ($ArgsList -contains "--version") {
    Write-Output "2026.0.1"
    exit 0
}
node "$PSScriptRoot\dist\index.js" @ArgsList
