import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Photo = {
  id: string;
  image_url: string;
  created_at: string;
};

type SlideshowCarouselProps = {
  photos: Photo[];
  duration?: number;
  animation?: "fade" | "slide" | "zoom";
  showControls?: boolean;
  showCaption?: boolean;
  eventName?: string;
  caption?: string;
};

export const SlideshowCarousel = ({
  photos,
  duration = 5,
  animation = "fade",
  showControls = false,
  showCaption = true,
  eventName = "VIBRANIUM 5.0",
  caption = "I HAVE PARTICIPATED",
}: SlideshowCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const nextSlide = useCallback(() => {
    if (photos.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
      setIsTransitioning(false);
    }, 300);
  }, [photos.length]);

  const prevSlide = useCallback(() => {
    if (photos.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      setIsTransitioning(false);
    }, 300);
  }, [photos.length]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  // Auto-advance slides
  useEffect(() => {
    if (!isPlaying || photos.length === 0) return;
    const interval = setInterval(nextSlide, duration * 1000);
    return () => clearInterval(interval);
  }, [isPlaying, nextSlide, duration, photos.length]);

  // Hide controls after inactivity
  useEffect(() => {
    if (!showControls) return;
    
    const handleMouseMove = () => {
      setControlsVisible(true);
      const timeout = setTimeout(() => setControlsVisible(false), 3000);
      return () => clearTimeout(timeout);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [showControls]);

  if (photos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5 px-4">
        <div className="text-center">
          <p className="font-display text-lg sm:text-2xl text-muted-foreground mb-2">No Photos Yet</p>
          <p className="text-sm sm:text-base text-muted-foreground">Photos will appear here as they are captured</p>
        </div>
      </div>
    );
  }

  const getAnimationClass = () => {
    if (!isTransitioning) {
      switch (animation) {
        case "fade":
          return "opacity-100 scale-100";
        case "slide":
          return "translate-x-0 opacity-100";
        case "zoom":
          return "scale-100 opacity-100";
        default:
          return "opacity-100";
      }
    }

    switch (animation) {
      case "fade":
        return "opacity-0 scale-95";
      case "slide":
        return "translate-x-full opacity-0";
      case "zoom":
        return "scale-110 opacity-0";
      default:
        return "opacity-0";
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
      
      {/* Main Photo */}
      <div className="relative h-full w-full flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div
          className={cn(
            "relative max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-full w-full transition-all duration-500 ease-out",
            getAnimationClass()
          )}
        >
          <img
            src={photos[currentIndex].image_url}
            alt={`Photo ${currentIndex + 1}`}
            className="w-full h-full object-contain rounded-xl sm:rounded-2xl shadow-2xl box-glow-blue"
          />
          
          {/* Holographic Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/20 rounded-xl sm:rounded-2xl pointer-events-none" />
        </div>
      </div>

      {/* Caption Overlay */}
      {showCaption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 via-background/80 to-transparent p-4 sm:p-6 md:p-8 pb-8 sm:pb-10 md:pb-12">
          <div className="text-center animate-fade-in">
            <p className="font-display text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-glow-blue mb-1 sm:mb-2">
              {caption}
            </p>
            <p className="font-display text-lg sm:text-xl md:text-2xl lg:text-3xl text-accent text-glow-purple">
              {eventName}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div
          className={cn(
            "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 flex gap-1 sm:gap-2 transition-opacity duration-300 z-50",
            controlsVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <Button
            onClick={prevSlide}
            size="icon"
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full box-glow-blue"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </Button>
          <Button
            onClick={togglePlay}
            size="icon"
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full box-glow-blue"
          >
            {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
          </Button>
          <Button
            onClick={nextSlide}
            size="icon"
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full box-glow-blue"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </Button>
        </div>
      )}

      {/* Photo Counter */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 bg-card/80 backdrop-blur-sm border border-primary/30 rounded-full px-2 sm:px-3 md:px-4 py-1 sm:py-2 font-display text-xs sm:text-sm">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
};
