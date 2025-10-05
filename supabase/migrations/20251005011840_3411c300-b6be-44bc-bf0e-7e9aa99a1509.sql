-- Create photos table
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved BOOLEAN DEFAULT true
);

-- Create booth_settings table
CREATE TABLE IF NOT EXISTS public.booth_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT DEFAULT 'Vibranium 5.0',
  caption TEXT DEFAULT 'I HAVE PARTICIPATED',
  watermark TEXT DEFAULT 'VIBRANIUM 5.0',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.booth_settings (event_name, caption, watermark)
VALUES ('Vibranium 5.0', 'I HAVE PARTICIPATED', 'VIBRANIUM 5.0');

-- Enable RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photos (public access for demo)
CREATE POLICY "Anyone can view photos" ON public.photos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert photos" ON public.photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete photos" ON public.photos FOR DELETE USING (true);

-- RLS Policies for booth_settings
CREATE POLICY "Anyone can view settings" ON public.booth_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can update settings" ON public.booth_settings FOR UPDATE USING (true);

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (public read/write for demo)
CREATE POLICY "Anyone can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "Anyone can delete photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos');

-- Enable realtime for photos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
ALTER TABLE public.photos REPLICA IDENTITY FULL;