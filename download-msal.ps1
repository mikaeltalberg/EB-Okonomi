# PowerShell script to download MSAL browser library
# Run this script to download the MSAL library locally

Write-Host "Downloading MSAL browser library..."

# Try multiple CDN sources
$urls = @(
    "https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js",
    "https://alcdn.msauth.net/lib/msal-browser/2.38.3/js/msal-browser.min.js",
    "https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/dist/msal-browser.min.js"
)

$success = $false
foreach ($url in $urls) {
    try {
        Write-Host "Trying: $url"
        Invoke-WebRequest -Uri $url -OutFile "msal-browser.min.js" -ErrorAction Stop
        Write-Host "✅ Successfully downloaded MSAL library!"
        $success = $true
        break
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)"
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "❌ All CDN sources failed. Please download manually:"
    Write-Host "1. Go to: https://www.npmjs.com/package/@azure/msal-browser"
    Write-Host "2. Download version 2.38.3"
    Write-Host "3. Extract msal-browser.min.js from the dist folder"
    Write-Host "4. Place it in the project root directory"
    exit 1
}

