# Compile Ironcliw Native Daemon
$rootDir = "C:\Users\nandk\Ironcliw-AI-Agent"
$sourceFile = "$rootDir\src\native\IroncliwDaemon\Program.cs"
$outputExe = "$rootDir\src\native\IroncliwDaemon\IroncliwDaemon.exe"

# Find csc.exe (C# Compiler)
$cscPath = Get-ChildItem -Path "C:\Windows\Microsoft.NET\Framework64" -Filter "csc.exe" -Recurse | Select-Object -First 1 -ExpandProperty FullName

if ($null -eq $cscPath) {
    Write-Host "[-] csc.exe not found." -ForegroundColor Red
    exit 1
}

Write-Host "[+] Compiling Ironcliw Native Daemon..." -ForegroundColor Cyan
# Run compiler with quoted paths
& $cscPath /out:"$outputExe" /target:exe "$sourceFile" /reference:System.Windows.Forms.dll,System.Drawing.dll

if (Test-Path "$outputExe") {
    Write-Host "[+] Compilation successful: $outputExe" -ForegroundColor Green
} else {
    Write-Host "[-] Compilation failed." -ForegroundColor Red
}
