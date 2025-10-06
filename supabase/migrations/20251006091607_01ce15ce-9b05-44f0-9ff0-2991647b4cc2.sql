-- Add template_image_url column to booth_settings table
ALTER TABLE public.booth_settings 
ADD COLUMN template_image_url text;