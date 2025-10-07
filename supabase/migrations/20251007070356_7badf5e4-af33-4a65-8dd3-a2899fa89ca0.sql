-- Update the caption to "CAUGHT IN VIBE VIBRANIUM 5.0"
UPDATE public.booth_settings 
SET caption = 'CAUGHT IN VIBE VIBRANIUM 5.0'
WHERE id IS NOT NULL;

-- Also update the default value for future records
ALTER TABLE public.booth_settings 
ALTER COLUMN caption SET DEFAULT 'CAUGHT IN VIBE VIBRANIUM 5.0';