# Vibranium 5.0 Photo Booth - Vercel Deployment Script (PowerShell)
# This script helps you deploy your photo booth to Vercel

Write-Host "🚀 Vibranium 5.0 Photo Booth - Vercel Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Check if Vercel CLI is installed
try {
    vercel --version | Out-Null
    Write-Host "✅ Vercel CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI is not installed. Installing..." -ForegroundColor Red
    npm install -g vercel
}

# Check if user is logged in to Vercel
try {
    vercel whoami | Out-Null
    Write-Host "✅ Logged in to Vercel" -ForegroundColor Green
} catch {
    Write-Host "🔐 Please log in to Vercel:" -ForegroundColor Yellow
    vercel login
}

# Build the project
Write-Host "📦 Building project..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed. Please check your code and try again." -ForegroundColor Red
    exit 1
}

# Deploy to Vercel
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Blue
Write-Host "Choose deployment type:" -ForegroundColor Yellow
Write-Host "1) Preview deployment (for testing)" -ForegroundColor White
Write-Host "2) Production deployment" -ForegroundColor White
$choice = Read-Host "Enter your choice (1 or 2)"

switch ($choice) {
    "1" {
        Write-Host "📋 Deploying preview..." -ForegroundColor Blue
        vercel
    }
    "2" {
        Write-Host "🌟 Deploying to production..." -ForegroundColor Blue
        vercel --prod
    }
    default {
        Write-Host "❌ Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host "📝 Don't forget to:" -ForegroundColor Yellow
Write-Host "   - Set up environment variables in Vercel dashboard" -ForegroundColor White
Write-Host "   - Configure your Supabase project" -ForegroundColor White
Write-Host "   - Test your deployment" -ForegroundColor White
Write-Host "   - Set up custom domain (optional)" -ForegroundColor White
