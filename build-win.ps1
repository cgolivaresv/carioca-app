# Compila Carioca como carpeta portable (sin instalador): dist-desktop\win-unpacked\Carioca.exe
# Uso:  powershell -ExecutionPolicy Bypass -File .\build-win.ps1
# Evita la herramienta winCodeSign de electron-builder (necesita permiso de symlinks) y pone el ícono con rcedit.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version
$out = Join-Path $PSScriptRoot 'dist-desktop\win-unpacked'

if (Get-Process Carioca -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$out\*" }) {
  throw 'Carioca esta abierto: cierralo antes de compilar.'
}
if (-not (Test-Path node_modules\electron\dist\electron.exe)) {
  npm install
  node node_modules\electron\install.js
}
npm test
if ($LASTEXITCODE) { throw 'Las pruebas fallaron: no se compila.' }

Remove-Item dist-desktop -Recurse -Force -ErrorAction SilentlyContinue
npx electron-builder --win --dir --publish never
if ($LASTEXITCODE) { throw 'Fallo el empaquetado.' }

# rcedit viene en la cache de winCodeSign (la deja el primer intento de electron-builder)
$rc = Get-ChildItem "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Filter rcedit-x64.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $rc) { throw 'No encuentro rcedit-x64.exe en la cache de electron-builder.' }
& $rc.FullName "$out\Carioca.exe" --set-icon build\icon.ico `
  --set-version-string ProductName Carioca --set-version-string FileDescription 'Carioca - suite de lujo' `
  --set-version-string CompanyName Carioca --set-file-version $ver --set-product-version $ver
if ($LASTEXITCODE) { throw 'rcedit fallo.' }
"Listo (v$ver): $out\Carioca.exe"