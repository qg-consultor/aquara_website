# PowerShell script to generate aquaraws deliverables

$workDir = Get-Location

# 1. Generate aquaraws-source.zip
$sourceItems = Get-ChildItem -Path . -Exclude 'node_modules','.git','dist','.vercel','*.zip','*checkpoint.txt','AQUARA_Hero_HD.mp4'
$sourcePaths = $sourceItems.FullName

Remove-Item -Path "aquaraws-source.zip" -ErrorAction SilentlyContinue
Compress-Archive -Path $sourcePaths -DestinationPath "$workDir\aquaraws-source.zip" -Force

# 2. Generate aquaraws-neubox-production.zip
Remove-Item -Path "aquaraws-neubox-production.zip" -ErrorAction SilentlyContinue

# Compress contents of dist directly into root of zip
$distItems = Get-ChildItem -Path "dist" -Force
$distPaths = $distItems.FullName
Compress-Archive -Path $distPaths -DestinationPath "$workDir\aquaraws-neubox-production.zip" -Force

Write-Host "ZIP files created successfully!"
