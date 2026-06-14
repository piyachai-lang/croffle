$token  = "nfp_JegjKzPHUJyiZiYSDnAnEzxD2qkU4pwPf0f8"
$siteId = "6e598330-1a75-4ea8-ad01-6a194d92b615"
$source = "C:\Claude AI\Food Delivery\Croffle"
$zip    = "C:\Claude AI\Food Delivery\croffle_deploy.zip"
$temp   = "C:\Claude AI\Food Delivery\croffle_temp"

Write-Host "Preparing files..."

if (Test-Path $zip)  { Remove-Item $zip -Force }
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }

New-Item -ItemType Directory -Path $temp | Out-Null
Copy-Item "$source\Croffle.html" $temp
Copy-Item "$source\netlify.toml" $temp
Copy-Item "$source\netlify" "$temp\netlify" -Recurse

Compress-Archive -Path "$temp\*" -DestinationPath $zip
Remove-Item $temp -Recurse -Force

Write-Host "Deploying to Netlify..."

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/zip"
}

try {
    $bytes = [System.IO.File]::ReadAllBytes($zip)
    $res   = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites/$siteId/deploys" -Method Post -Headers $headers -Body $bytes
    Write-Host "SUCCESS! State: $($res.state)"
    Write-Host "URL: $($res.deploy_ssl_url)"
} catch {
    Write-Host "ERROR: $_"
}

Write-Host "Done. Press Enter to close."
Read-Host
