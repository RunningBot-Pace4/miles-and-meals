$ErrorActionPreference = "Stop"

Write-Host "Miles & Meals — local setup" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js was not found. Install Node.js 22 or newer, then reopen Visual Studio."
}

$nodeVersion = node --version
Write-Host "Node: $nodeVersion"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Green
    Write-Host "Open .env and enter your Neon DATABASE_URL, auth secret and admin account before continuing." -ForegroundColor Yellow
} else {
    Write-Host ".env already exists." -ForegroundColor Green
}

Write-Host ""
Write-Host "After editing .env, run:" -ForegroundColor Cyan
Write-Host "npm install"
Write-Host "npm run db:push"
Write-Host "npm run seed:admin"
Write-Host "npm test"
Write-Host "npm run dev"
