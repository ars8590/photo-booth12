import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://afc18af9-128f-4a9c-918c-62821b88dfad.lovableproject.com/integrations/supabase";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYzE4YWY5LTEyOGYtNGE5Yy05MThjLTYyODIxYjg4ZGZhZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzU5NjI2NzI3LCJleHAiOjIwNzUyMDI3Mjd9.9KvL4_Xx8YvGqK2qK6Y0Z8QqYN0Z8QqYN0Z8QqYN0Z8";

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
