import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Photo = {
  id: string;
  image_url: string;
  created_at: string;
  approved: boolean;
};

export type BoothSettings = {
  id: string;
  event_name: string;
  caption: string;
  watermark: string;
  updated_at: string;
};
