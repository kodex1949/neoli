# Copie les agents et Skills vers .claude/ SANS écraser un fichier existant.
# Lancer depuis la racine du dépôt :  powershell -ExecutionPolicy Bypass -File docs\ai-operations\install-claude-config.ps1
$src = "docs\ai-operations\claude"
foreach ($sub in "agents","skills") {
  Get-ChildItem "$src\$sub" -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring((Resolve-Path "$src\$sub").Path.Length + 1)
    $dst = Join-Path ".claude\$sub" $rel
    if (Test-Path $dst) { Write-Host "existe déjà, ignoré : $dst" }
    else { New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null; Copy-Item $_.FullName $dst; Write-Host "copié : $dst" }
  }
}
