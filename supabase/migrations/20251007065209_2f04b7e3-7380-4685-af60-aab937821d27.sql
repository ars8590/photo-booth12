-- Add slideshow settings to booth_settings table
ALTER TABLE public.booth_settings
ADD COLUMN IF NOT EXISTS slideshow_duration INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS slideshow_animation TEXT DEFAULT 'fade',
ADD COLUMN IF NOT EXISTS slideshow_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS slideshow_caption_enabled BOOLEAN DEFAULT true;