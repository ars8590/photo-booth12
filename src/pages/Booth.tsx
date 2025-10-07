import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Download, RotateCcw, FlipHorizontal, Power, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

type FilterType = 'normal' | 'blackwhite' | 'anime-ai' | 'age-reduce-ai';

const FILTERS: { id: FilterType; name: string; icon: string; css: string; isAI?: boolean }[] = [
  { id: 'normal', name: 'Normal', icon: '🎞', css: 'none' },
  { id: 'blackwhite', name: 'Black & White', icon: '⚫', css: 'grayscale(1) contrast(1.2)' },
  { id: 'anime-ai', name: 'AI Anime Artstyle', icon: '🎨', css: 'none', isAI: true },
  { id: 'age-reduce-ai', name: 'Age-Reducing', icon: '🕓', css: 'none', isAI: true },
];

const Booth = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [mirrorCamera, setMirrorCamera] = useState(true);
  const [activeTemplateUrl, setActiveTemplateUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('normal');
  const [showFilters, setShowFilters] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchActiveTemplate();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const fetchActiveTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('image_url')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      if (data) setActiveTemplateUrl(data.image_url);
    } catch (error) {
      console.error('Error fetching template:', error);
    }
  };

  const startCamera = async () => {
    try {
      // Set aspect ratio based on device type
      const aspectRatio = isMobile ? 9 / 16 : 16 / 9;
      const idealWidth = isMobile ? 1080 : 1920;
      const idealHeight = isMobile ? 1920 : 1080;
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
          aspectRatio: { ideal: aspectRatio },
        },
        audio: false,
      });

      const video = videoRef.current;
      if (video) {
        // iOS-safe inline playback
        video.setAttribute("playsinline", "true");
        video.setAttribute("muted", "true");
        video.muted = true;
        (video as any).srcObject = mediaStream;

        // Wait for video to have valid dimensions
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Video timeout")), 5000);
          
          const checkReady = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              clearTimeout(timeout);
              resolve();
            }
          };

          video.addEventListener("loadedmetadata", checkReady, { once: true });
          video.addEventListener("canplay", checkReady, { once: true });
          
          // Check immediately in case already loaded
          if (video.readyState >= 2 && video.videoWidth > 0) {
            clearTimeout(timeout);
            resolve();
          }
        });

        // Start playback
        try {
          await video.play();
        } catch (playError) {
          console.warn("Play error (may be safe to ignore):", playError);
        }

        // Final verification before activating
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setStream(mediaStream);
          setCameraActive(true);
          toast.success("Camera activated!");
        } else {
          throw new Error("Video dimensions not available");
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Camera access needed to capture your Vibranium moment.");
      setCameraActive(false);
      // Clean up stream if it exists
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      const v = videoRef.current;
      try { v.pause(); } catch (_) {}
      try { (v as any).srcObject = null; } catch (_) {}
      try { v.load(); } catch (_) {}
    }
    setCameraActive(false);
    toast.info("Camera deactivated");
  };

  const toggleCamera = async () => {
    if (cameraActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  const capturePhoto = async () => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Check if video is ready
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast.error("Camera not ready. Please wait a moment.");
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Save context state
        ctx.save();
        
        // Mirror the image if mirror mode is enabled
        if (mirrorCamera) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        // Apply CSS filter to canvas context (for non-AI filters)
        const activeFilter = FILTERS.find(f => f.id === selectedFilter);
        if (activeFilter && activeFilter.css !== 'none' && !activeFilter.isAI) {
          ctx.filter = activeFilter.css;
        }
        
        // Draw camera feed
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset filter
        ctx.filter = 'none';
        
        // Restore context state
        ctx.restore();
        
        let finalImageData = canvas.toDataURL("image/png");

        // If AI filter is selected, transform the image
        if (activeFilter?.isAI) {
          setIsProcessingAI(true);
          
          const isAnimeFilter = selectedFilter === 'anime-ai';
          const isAgeReduceFilter = selectedFilter === 'age-reduce-ai';
          
          if (isAnimeFilter) {
            toast.info("✨ Generating Anime Style... Please wait...");
          } else if (isAgeReduceFilter) {
            toast.info("🕓 Rewinding time... Creating your younger self...");
          }
          
          try {
            const functionName = isAnimeFilter ? 'anime-style-transform' : 'age-reducing-transform';
            const { data, error } = await supabase.functions.invoke(functionName, {
              body: { imageData: finalImageData }
            });

            if (error) throw error;
            
            const transformedImageKey = isAnimeFilter ? 'animeImage' : 'transformedImage';
            if (!data?.[transformedImageKey]) {
              throw new Error('No transformed image returned');
            }

            // Create a new canvas for the transformed image
            const transformedCanvas = document.createElement('canvas');
            transformedCanvas.width = canvas.width;
            transformedCanvas.height = canvas.height;
            const transformedCtx = transformedCanvas.getContext('2d');
            
            if (!transformedCtx) {
              throw new Error('Failed to create canvas context');
            }

            // Load and draw the transformed image
            const transformedImg = new Image();
            await new Promise((resolve, reject) => {
              transformedImg.onload = resolve;
              transformedImg.onerror = reject;
              transformedImg.src = data[transformedImageKey];
            });

            transformedCtx.drawImage(transformedImg, 0, 0, transformedCanvas.width, transformedCanvas.height);
            
            // Overlay template if exists
            if (activeTemplateUrl) {
              const templateImg = new Image();
              templateImg.crossOrigin = "anonymous";
              
              await new Promise((resolve, reject) => {
                templateImg.onload = resolve;
                templateImg.onerror = reject;
                templateImg.src = activeTemplateUrl;
              });
              
              transformedCtx.drawImage(templateImg, 0, 0, transformedCanvas.width, transformedCanvas.height);
            }

            finalImageData = transformedCanvas.toDataURL('image/png');
            
            if (isAnimeFilter) {
              toast.success("💠 Your Anime Self is Ready!");
            } else if (isAgeReduceFilter) {
              toast.success("💫 You've traveled back in time!");
            }
          } catch (error) {
            console.error('Error processing AI filter:', error);
            const filterType = isAnimeFilter ? 'anime style' : 'age reduction';
            toast.error(`Failed to apply ${filterType}. Using original photo.`);
            // Continue with non-AI processed image
          } finally {
            setIsProcessingAI(false);
          }
        } else {
          // For non-AI filters, just apply template overlay
          if (activeTemplateUrl) {
            await new Promise<void>((resolve, reject) => {
              const templateImg = new Image();
              templateImg.crossOrigin = "anonymous";
              templateImg.onload = () => {
                ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
                resolve();
              };
              templateImg.onerror = reject;
              templateImg.src = activeTemplateUrl;
            });
            finalImageData = canvas.toDataURL("image/png");
          }
        }

        setCapturedImage(finalImageData);
        if (!activeFilter?.isAI) {
          toast.success("Photo captured!");
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = async (event) => {
      const src = event.target?.result as string;
      img.onload = async () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Determine target size based on live video if available
        const video = videoRef.current;
        const targetW = video?.videoWidth || img.naturalWidth;
        const targetH = video?.videoHeight || img.naturalHeight;
        canvas.width = targetW;
        canvas.height = targetH;

        // Draw uploaded image with object-fit: cover behavior
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = targetW / targetH;
        let drawW = targetW;
        let drawH = targetH;
        let dx = 0;
        let dy = 0;
        if (imgAspect > canvasAspect) {
          // Image is wider than canvas
          drawH = targetH;
          drawW = imgAspect * drawH;
          dx = (targetW - drawW) / 2;
        } else {
          // Image is taller than canvas
          drawW = targetW;
          drawH = drawW / imgAspect;
          dy = (targetH - drawH) / 2;
        }
        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Overlay active template if present
        if (activeTemplateUrl) {
          await new Promise<void>((resolve, reject) => {
            const overlay = new Image();
            overlay.crossOrigin = 'anonymous';
            overlay.onload = () => {
              ctx.drawImage(overlay, 0, 0, targetW, targetH);
              resolve();
            };
            overlay.onerror = reject;
            overlay.src = activeTemplateUrl;
          });
        }

        const merged = canvas.toDataURL('image/png');
        setCapturedImage(merged);
        toast.success('Photo uploaded!');
      };
      img.src = src;
    };

    reader.readAsDataURL(file);
  };

  const downloadPhoto = async () => {
    if (!capturedImage) return;

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Upload to storage
      const fileName = `vibranium-5.0-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('photos')
        .insert({ image_url: publicUrl });

      if (dbError) throw dbError;

      // Download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success("Photo saved and downloaded!");
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error("Failed to save photo");
    }
  };

  const retakePhoto = async () => {
    setCapturedImage(null);
    await startCamera();
    toast.info("Ready for next photo!");
  };

  return (
    <div className="min-h-screen pt-16 md:pt-20 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold text-glow-blue mb-2">
            VIBRANIUM 5.0
          </h1>
          
        </div>

        {/* Main Camera/Photo View */}
        <div ref={containerRef} className="relative rounded-2xl overflow-hidden border-4 border-glow aspect-[9/16] md:aspect-video mb-6">
        {!capturedImage ? (
            <>
              {/* Video Element - Bottom Layer (z-index: 1) */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute top-0 left-0 w-full h-full object-cover transition-all duration-500 ${
                  cameraActive ? 'opacity-100 animate-fade-in' : 'opacity-0 pointer-events-none'
                }`}
                style={{
                  transform: mirrorCamera ? 'scaleX(-1)' : 'scaleX(1)',
                  filter: FILTERS.find(f => f.id === selectedFilter)?.css || 'none',
                  zIndex: 1,
                }}
              />
              
              {/* Template Overlay - Top Layer (z-index: 2) */}
              {cameraActive && activeTemplateUrl && (
                <img
                  src={activeTemplateUrl}
                  alt="Template overlay"
                  className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
                  style={{
                    zIndex: 2,
                    background: 'transparent',
                  }}
                />
              )}
              
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Camera Power Toggle Button - z-index: 10 */}
              <Button
                onClick={toggleCamera}
                size="icon"
                className={`absolute top-4 left-4 backdrop-blur-sm border transition-all duration-300 hover:scale-110 ${
                  cameraActive 
                    ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(0,217,255,0.6)] text-primary' 
                    : 'bg-background/50 border-muted-foreground/20 text-muted-foreground/50'
                }`}
                style={{ zIndex: 10 }}
              >
                <Power className={`w-5 h-5 transition-all duration-300 ${cameraActive ? 'animate-pulse' : ''}`} />
              </Button>

              {cameraActive && (
                <>
                  {/* Holographic Overlay - z-index: 3 */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-accent/10 pointer-events-none"
                    style={{ zIndex: 3 }}
                  />
                  
                  {/* Mirror Toggle Button - z-index: 10 */}
                  <Button
                    onClick={() => setMirrorCamera(!mirrorCamera)}
                    size="icon"
                    variant="secondary"
                    className="absolute top-4 right-4 box-glow-blue backdrop-blur-sm bg-background/50 border border-primary/30"
                    style={{ zIndex: 10 }}
                  >
                    <FlipHorizontal className={`w-5 h-5 ${mirrorCamera ? 'text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                </>
              )}
              
              {!cameraActive && (
                /* Camera Off Placeholder - z-index: 5 */
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5 animate-fade-in"
                  style={{ zIndex: 5 }}
                >
                  <div className="text-center space-y-4 px-4">
                    <div className="relative inline-block">
                      <Camera className="w-20 h-20 md:w-32 md:h-32 text-primary/30" />
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                    </div>
                    <p className="font-display text-lg md:text-2xl text-primary text-glow-blue">
                      Camera Disabled
                    </p>
                    <p className="text-sm md:text-base text-accent text-glow-purple">
                      Tap Power to Activate
                    </p>
                  </div>
                </div>
              )}
              
              {/* Corner Accents - z-index: 4 */}
              <div className="absolute top-2 left-2 w-12 h-12 sm:w-16 sm:h-16 border-l-4 border-t-4 border-primary box-glow-blue" style={{ zIndex: 4 }} />
              <div className="absolute top-2 right-2 w-12 h-12 sm:w-16 sm:h-16 border-r-4 border-t-4 border-primary box-glow-blue" style={{ zIndex: 4 }} />
              <div className="absolute bottom-2 left-2 w-12 h-12 sm:w-16 sm:h-16 border-l-4 border-b-4 border-accent box-glow-purple" style={{ zIndex: 4 }} />
              <div className="absolute bottom-2 right-2 w-12 h-12 sm:w-16 sm:h-16 border-r-4 border-b-4 border-accent box-glow-purple" style={{ zIndex: 4 }} />
            </>
          ) : (
            <div className="relative w-full h-full">
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              
              {/* Vibranium Template Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-accent/20" />
              
              {/* Caption Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-6">
                <p className="text-center font-display text-2xl font-bold text-glow-blue">
                  CAUGHT IN VIBE
                </p>
                <p className="text-center font-display text-lg text-accent text-glow-purple">
                  VIBRANIUM 5.0
                </p>
              </div>

              {/* Watermark */}
              <div className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm px-3 py-1 rounded-lg border border-primary/30">
                <p className="font-display text-xs text-primary">V5.0</p>
              </div>
            </div>
          )}
        </div>

        {/* Filter Selector */}
        {!capturedImage && cameraActive && (
          <div className="mb-4 animate-fade-in">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="lg"
              disabled={isProcessingAI}
              className="w-full box-glow-purple font-display text-base md:text-lg px-6 md:px-8 min-h-[48px] border-2 border-accent/50 bg-background/80 backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Filters {FILTERS.find(f => f.id === selectedFilter)?.icon}
            </Button>
            
            {showFilters && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2 animate-scale-in">
                {FILTERS.map((filter) => (
                  <Button
                    key={filter.id}
                    onClick={() => {
                      setSelectedFilter(filter.id);
                      toast.success(
                        filter.isAI 
                          ? `${filter.name} will be applied after capture!` 
                          : `${filter.name} filter applied!`
                      );
                    }}
                    variant={selectedFilter === filter.id ? "default" : "outline"}
                    size="lg"
                    disabled={isProcessingAI}
                    className={`flex-shrink-0 font-display min-w-[140px] transition-all duration-300 ${
                      selectedFilter === filter.id 
                        ? 'box-glow-blue border-2 border-primary scale-105 shadow-[0_0_25px_rgba(0,217,255,0.7)]' 
                        : 'border-2 border-muted-foreground/30 hover:border-accent hover:scale-105'
                    }`}
                  >
                    <span className="text-2xl mr-2">{filter.icon}</span>
                    <span className="text-sm">{filter.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-center">
          {!capturedImage ? (
            <>
              <Button
                onClick={capturePhoto}
                disabled={!cameraActive || isProcessingAI}
                size="lg"
                className="box-glow-blue font-display text-base md:text-lg px-6 md:px-8 min-h-[48px] w-full sm:w-auto"
              >
                <Camera className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                {isProcessingAI ? "Processing..." : "Capture Photo"}
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                size="lg"
                className="box-glow-purple font-display text-base md:text-lg px-6 md:px-8 min-h-[48px] w-full sm:w-auto"
              >
                <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Upload Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          ) : (
            <>
              <Button
                onClick={downloadPhoto}
                size="lg"
                className="box-glow-blue font-display text-base md:text-lg px-6 md:px-8 min-h-[48px] w-full sm:w-auto"
              >
                <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Save and Download Photo
              </Button>
              <Button
                onClick={retakePhoto}
                variant="secondary"
                size="lg"
                className="box-glow-purple font-display text-base md:text-lg px-6 md:px-8 min-h-[48px] w-full sm:w-auto"
              >
                <RotateCcw className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Retake
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Hidden Admin Trigger - Bottom Right Corner */}
      <button
        onClick={() => navigate('/admin')}
        className="fixed bottom-4 right-4 w-12 h-12 opacity-0 hover:opacity-100 transition-opacity duration-300 bg-primary/5 hover:bg-primary/20 rounded-full border border-primary/20 hover:border-primary/50 backdrop-blur-sm"
        aria-label="Admin Access"
      />
    </div>
  );
};

export default Booth;
