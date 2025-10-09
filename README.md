# 💎 Vibranium 5.0 Photo Booth

A modern, responsive photo booth application with AI-powered filters, template overlays, and real-time photo sharing capabilities. Built with React, TypeScript, and Supabase.

## ✨ Features

- **📸 Real-time Camera Capture**: High-quality photo capture with front/back camera switching
- **🎨 AI-Powered Filters**: Including anime-style transformation using Supabase Edge Functions
- **🖼️ Template Overlays**: Responsive template system that auto-scales across all devices
- **📱 Mobile Optimized**: Perfect experience on desktop, tablet, and mobile devices
- **👑 Admin Panel**: Complete management system for photos, templates, and settings
- **🔄 Real-time Updates**: Live photo feed with slideshow capabilities
- **💾 Cloud Storage**: Secure photo storage and management with Supabase
- **🎯 Responsive Design**: Glassmorphism UI with Vibranium brand colors

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)

### Local Development

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd photo-booth12
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Copy the example file
cp env.example .env.local

# Edit .env.local with your Supabase credentials
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Start the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:8081`

## 🛠️ Technologies Used

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **Backend**: Supabase (Database, Storage, Edge Functions)
- **Deployment**: Vercel
- **Styling**: Glassmorphism design with custom CSS animations

## 📱 Responsive Template System

The photo booth features an advanced responsive template system:

- **Auto-scaling**: Templates automatically resize to fit any device
- **Aspect Ratio Preservation**: No stretching or clipping
- **Device Detection**: Optimized for desktop (4:3), tablet (4:3), and mobile (3:4)
- **Orientation Support**: Handles portrait and landscape orientations
- **Live Preview**: Real-time template preview in admin panel

## 🎨 Admin Panel Features

- **Photo Management**: View, delete, and export all captured photos
- **Template Control**: Upload, activate, and deactivate overlay templates
- **Settings Management**: Configure event name, captions, and watermarks
- **Slideshow Control**: Adjust duration, animations, and display settings
- **Real-time Updates**: Live synchronization across all connected devices

## 🚀 Deployment to Vercel

### Automatic Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (choose preview or production)
npm run deploy:preview  # For testing
npm run deploy         # For production
```

### Manual Deployment
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Environment Variables
Set these in your Vercel dashboard:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── Footer.tsx      # Footer component
│   ├── Navigation.tsx  # Navigation bar
│   └── SlideshowCarousel.tsx # Photo slideshow
├── hooks/              # Custom React hooks
├── integrations/       # Supabase configuration
├── lib/                # Utility functions
│   ├── template-utils.ts # Template scaling utilities
│   └── utils.ts        # General utilities
├── pages/              # Main application pages
│   ├── Admin.tsx       # Admin panel
│   ├── Booth.tsx       # Photo booth interface
│   ├── Feed.tsx        # Photo gallery
│   └── Slideshow.tsx   # Display mode
└── supabase/           # Supabase configuration
    ├── functions/      # Edge functions
    └── migrations/     # Database migrations
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run deploy       # Deploy to Vercel (production)
npm run deploy:preview # Deploy to Vercel (preview)
```

## 🎯 Key Features Implementation

### Responsive Template Scaling
- Automatic aspect ratio detection
- Dynamic scaling based on viewport
- Cross-device compatibility
- No stretching or clipping

### AI Filter Integration
- Supabase Edge Functions for AI processing
- Anime-style transformation
- Optimized image processing
- Error handling and fallbacks

### Real-time Photo Management
- Live photo feed updates
- Automatic photo storage
- Admin controls for photo management
- Export functionality

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Detailed Vercel deployment instructions
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the [Deployment Guide](DEPLOYMENT.md)
- Review the [Supabase Documentation](https://supabase.com/docs)
- Open an issue in the repository

---

**Built with ❤️ for Vibranium 5.0**
