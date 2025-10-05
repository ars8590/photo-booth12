import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase, Photo } from "@/lib/supabase";
import { toast } from "sonner";

// Sample photos for demonstration
const samplePhotos = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
];

const Feed = () => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
    
    // Subscribe to new photos
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos'
        },
        () => loadPhotos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  const downloadPhoto = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `vibranium-5.0-photo-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="min-h-screen pt-16 md:pt-20 pb-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-glow-blue mb-2">
            Photo Gallery
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">All captured moments from Vibranium 5.0</p>
        </div>

        {/* Photo Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading photos...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No photos yet. Take some photos at the booth!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo.image_url)}
                className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-primary/20 hover:border-primary transition-all duration-300"
              >
                <img
                  src={photo.image_url}
                  alt="Gallery photo"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-display text-sm text-primary text-glow-blue">
                    Click to view
                  </p>
                </div>
              </div>

              {/* Corner Accent */}
              <div className="absolute top-1 right-1 w-8 h-8 border-r-2 border-t-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            ))}
          </div>
        )}
      </div>

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
                I HAVE PARTICIPATED
              </p>
              <p className="text-center font-display text-lg text-accent text-glow-purple">
                VIBRANIUM 5.0
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
    </div>
  );
};

export default Feed;
