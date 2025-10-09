# 🚀 Vercel Deployment Guide for Vibranium 5.0 Photo Booth

## Prerequisites
- Vercel account (free tier available)
- Supabase project set up
- Git repository (GitHub, GitLab, or Bitbucket)

## Quick Deployment Steps

### 1. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
```bash
# For preview deployment
npm run deploy:preview

# For production deployment
npm run deploy
```

## Environment Variables Setup

### In Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```
VITE_SUPABASE_URL = your_supabase_project_url
VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
```

### Local Development:
1. Copy `env.example` to `.env.local`
2. Fill in your Supabase credentials
3. Run `npm run dev`

## Supabase Edge Functions Deployment

Your Supabase edge functions are already configured in the `supabase/` directory. To deploy them:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy
```

## Build Configuration

The project is configured with:
- **Build Command**: `vite build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Custom Domain Setup

1. In Vercel dashboard, go to "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `VITE_APP_URL` environment variable

## Performance Optimizations

- Static assets are automatically optimized
- Images are served from Vercel's CDN
- Supabase functions run on Vercel's edge network
- Automatic HTTPS enabled

## Monitoring & Analytics

- Vercel Analytics (optional): Add `VITE_VERCEL_ANALYTICS_ID`
- Supabase Dashboard: Monitor database and function usage
- Vercel Dashboard: Monitor deployment performance

## Troubleshooting

### Common Issues:
1. **Build Failures**: Check environment variables are set correctly
2. **Supabase Connection**: Verify URL and keys are correct
3. **Function Errors**: Check Supabase function logs
4. **Domain Issues**: Verify DNS configuration

### Support:
- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- Project Issues: Check GitHub repository

## Deployment Checklist

- [ ] Vercel CLI installed and logged in
- [ ] Environment variables configured
- [ ] Supabase project linked
- [ ] Build command working locally (`npm run build`)
- [ ] Preview deployment successful
- [ ] Production deployment successful
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled (optional)

## Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Preview deployment
npm run deploy:preview

# Production deployment
npm run deploy

# Vercel CLI commands
vercel login
vercel --prod
vercel logs
vercel domains
```
