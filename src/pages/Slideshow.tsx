import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SlideshowCarousel } from "@/components/SlideshowCarousel";
import { toast } from "sonner";

type Photo = {
  id: string;
  image_url: string;
  created_at: string;
  approved: boolean;
};

type BoothSettings = {
  event_name: string | null;
  caption: string | null;
  slideshow_duration: number | null;
  slideshow_animation: string | null;
  slideshow_caption_enabled: boolean | null;
};

const Slideshow = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<BoothSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Subscribe to new photos
    const photosChannel = supabase
      .channel("slideshow-photos-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
        },
        () => loadPhotos()
      )
      .subscribe();

    // Subscribe to settings changes
    const settingsChannel = supabase
      .channel("slideshow-settings-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "booth_settings",
        },
        () => loadSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(photosChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadPhotos(), loadSettings()]);
    setLoading(false);
  };

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error loading photos:", error);
      toast.error("Failed to load photos");
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("booth_settings")
        .select("event_name, caption, slideshow_duration, slideshow_animation, slideshow_caption_enabled")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display text-xl text-muted-foreground">Loading Slideshow...</p>
        </div>
      </div>
    );
  }

  return (
    <SlideshowCarousel
      photos={photos}
      duration={settings?.slideshow_duration || 5}
      animation={(settings?.slideshow_animation as "fade" | "slide" | "zoom") || "fade"}
      showControls={false}
      showCaption={settings?.slideshow_caption_enabled ?? true}
      eventName={settings?.event_name || "VIBRANIUM 5.0"}
      caption={settings?.caption || "I HAVE PARTICIPATED"}
    />
  );
};

export default Slideshow;
