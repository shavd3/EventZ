$env:NODE_OPTIONS = $null
$env:PATH = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Schniz.fnm_Microsoft.Winget.Source_8wekyb3d8bbwe;$env:PATH"
fnm env --shell powershell | Invoke-Expression
npm run dev
