import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://brlfizqmdiwrhqdcrbij.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJybGZpenFtZGl3cmhxZGNyYmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NTgwMDUsImV4cCI6MjA3NTEzNDAwNX0.GK3yY90EPjvWdZlTEEMhJrfvGMn-GKs4zxqah5JwJP8";

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
