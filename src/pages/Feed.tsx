import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

const Feed = () => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<BoothSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Subscribe to new photos
    const photosChannel = supabase
      .channel("feed-photos-changes")
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
      .channel("feed-settings-changes")
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

  const downloadPhoto = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `vibranium-5.0-photo-${Date.now()}.jpg`;
    link.click();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display text-xl text-muted-foreground">Loading Feed...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SlideshowCarousel
        photos={photos}
        duration={settings?.slideshow_duration || 5}
        animation={(settings?.slideshow_animation as "fade" | "slide" | "zoom") || "fade"}
        showControls={true}
        showCaption={settings?.slideshow_caption_enabled ?? true}
        eventName={settings?.event_name || "VIBRANIUM 5.0"}
        caption={settings?.caption || "I HAVE PARTICIPATED"}
      />

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl bg-card border-primary/50 p-0">
          <div className="relative">
            <img
              src={selectedPhoto || ""}
              alt="Selected photo"
              className="w-full h-auto rounded-lg"
            />

            {/* Template Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-accent/10" />

            {/* Caption */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 to-transparent p-6">
              <p className="text-center font-display text-2xl font-bold text-glow-blue mb-1">
                {settings?.caption || "I HAVE PARTICIPATED"}
              </p>
              <p className="text-center font-display text-lg text-accent text-glow-purple">
                {settings?.event_name || "VIBRANIUM 5.0"}
              </p>
            </div>

            {/* Download Button */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                onClick={() => selectedPhoto && downloadPhoto(selectedPhoto)}
                size="sm"
                className="box-glow-blue"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={() => setSelectedPhoto(null)}
                variant="secondary"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Feed;
