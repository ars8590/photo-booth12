#!/bin/bash

# Vibranium 5.0 Photo Booth - Vercel Deployment Script
# This script helps you deploy your photo booth to Vercel

echo "🚀 Vibranium 5.0 Photo Booth - Vercel Deployment"
echo "================================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
fi

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check your code and try again."
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo "Choose deployment type:"
echo "1) Preview deployment (for testing)"
echo "2) Production deployment"
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo "📋 Deploying preview..."
        vercel
        ;;
    2)
        echo "🌟 Deploying to production..."
        vercel --prod
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo "🎉 Deployment complete!"
echo "📝 Don't forget to:"
echo "   - Set up environment variables in Vercel dashboard"
echo "   - Configure your Supabase project"
echo "   - Test your deployment"
echo "   - Set up custom domain (optional)"
