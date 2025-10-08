import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Download, RotateCcw, FlipHorizontal, Power, Sparkles, SwitchCamera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile, useMobileOrientation } from "@/hooks/use-mobile";
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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [activeTemplateUrl, setActiveTemplateUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('normal');
  const [showFilters, setShowFilters] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const isMobile = useIsMobile();
  const mobileOrientation = useMobileOrientation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Function to adjust preview layout for mobile orientation
  const adjustPreviewLayout = () => {
    if (!containerRef.current || !isMobile) return;
    
    const container = containerRef.current;
    const ratio = 4 / 3;
    const { innerWidth, innerHeight } = window;
    const isPortrait = innerHeight > innerWidth;

    if (isPortrait) {
      // In portrait, make height fit the 4:3 ratio
      const maxHeight = innerWidth * ratio;
      container.style.height = `${Math.min(maxHeight, innerHeight * 0.8)}px`;
    } else {
      // In landscape, make width fit the 4:3 ratio
      const maxWidth = innerHeight * (3 / 4);
      container.style.width = `${Math.min(maxWidth, innerWidth * 0.8)}px`;
    }
  };

  useEffect(() => {
    fetchActiveTemplate();
    
    // Add orientation change listeners for mobile
    if (isMobile) {
      adjustPreviewLayout();
      window.addEventListener('resize', adjustPreviewLayout);
      window.addEventListener('orientationchange', adjustPreviewLayout);
      
      return () => {
        window.removeEventListener('resize', adjustPreviewLayout);
        window.removeEventListener('orientationchange', adjustPreviewLayout);
      };
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream, isMobile]);

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
      // Optimized camera configuration for mobile selfie view
      let videoConstraints;
      
      if (isMobile && facingMode === "user") {
        // Mobile front camera - request native 4:3 resolution
        videoConstraints = {
          facingMode: "user",
          width: { ideal: 1600 },
          height: { ideal: 1200 },
          aspectRatio: { ideal: 1.3333333 }, // 4:3 ratio for natural selfie view
        };
      } else if (isMobile) {
        // Mobile back camera - request native 4:3 resolution
        videoConstraints = {
          facingMode: { ideal: facingMode },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
          aspectRatio: { ideal: 1.3333333 }, // 4:3 ratio
        };
      } else {
        // Desktop - use higher native resolution
        videoConstraints = {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
          aspectRatio: { ideal: 1.3333333 }, // 4:3 ratio
        };
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
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

        // Check if device forced zoom/crop - fallback to lower resolution
        if (isMobile && facingMode === "user" && video.videoWidth > 0 && video.videoHeight > 0) {
          const actualAspectRatio = video.videoWidth / video.videoHeight;
          const expectedAspectRatio = 1.3333333; // 4:3 ratio
          const aspectRatioDiff = Math.abs(actualAspectRatio - expectedAspectRatio);
          
          // If aspect ratio is significantly different, try fallback resolution
          if (aspectRatioDiff > 0.1) {
            console.log("Device forced zoom detected, trying fallback resolution");
            try {
              // Stop current stream
              mediaStream.getTracks().forEach(track => track.stop());
              
              // Try fallback with lower resolution maintaining 4:3 ratio
              const fallbackStream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: "user",
                  width: { ideal: 1280 },
                  height: { ideal: 960 }, // 4:3 ratio
                },
                audio: false,
              });
              
              (video as any).srcObject = fallbackStream;
              await video.play();
              setStream(fallbackStream);
              setCameraActive(true);
              toast.success("Camera activated with fallback settings!");
              return;
            } catch (fallbackError) {
              console.warn("Fallback resolution failed:", fallbackError);
            }
          }
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

  const switchCamera = async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);
    if (cameraActive) {
      stopCamera();
      setTimeout(async () => {
        await startCamera();
      }, 100);
    }
    toast.info(`Switched to ${newFacingMode === "user" ? "front" : "back"} camera`);
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
      
      // Get actual camera resolution from video stream
      const track = stream?.getVideoTracks()[0];
      const settings = track?.getSettings();
      const actualWidth = settings?.width || video.videoWidth;
      const actualHeight = settings?.height || video.videoHeight;
      
      // Use actual camera resolution for canvas
      canvas.width = actualWidth;
      canvas.height = actualHeight;
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
        
        // Draw camera feed with actual resolution
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset filter
        ctx.filter = 'none';
        
        // Restore context state
        ctx.restore();
        
        let finalImageData = canvas.toDataURL("image/png");

        const downscaleDataUrl = async (dataUrl: string, maxSize = 640, quality = 0.75): Promise<string> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const srcW = img.naturalWidth;
              const srcH = img.naturalHeight;
              const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
              const targetW = Math.max(1, Math.round(srcW * scale));
              const targetH = Math.max(1, Math.round(srcH * scale));
              const tmp = document.createElement('canvas');
              tmp.width = targetW;
              tmp.height = targetH;
              const ctx2 = tmp.getContext('2d');
              if (!ctx2) {
                resolve(dataUrl);
                return;
              }
              ctx2.drawImage(img, 0, 0, targetW, targetH);
              // Use JPEG to dramatically reduce payload size
              const out = tmp.toDataURL('image/jpeg', quality);
              resolve(out);
            };
            img.onerror = reject;
            img.src = dataUrl;
          });
        };

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
            // Downscale before sending to edge function to avoid payload limits
            const payloadImage = await downscaleDataUrl(finalImageData, 1024, 0.85);
            const functionName = isAnimeFilter ? 'anime-style-transform' : 'age-reducing-transform';
            const { data, error } = await supabase.functions.invoke(functionName, {
              body: { imageData: payloadImage }
            });

            if (error) {
              const e: any = error as any;
              // Surface status/body if available
              const status = e?.context?.status;
              const body = e?.context?.body;
              console.error('AI function error:', { message: error.message, status, body });
              throw new Error(status ? `${status}: ${body || error.message}` : (error.message || 'Edge function error'));
            }
            
            const transformedImageKey = isAnimeFilter ? 'animeImage' : 'transformedImage';
            if (!data?.[transformedImageKey]) {
              console.error('Unexpected AI response payload:', data);
              throw new Error('No transformed image returned');
            }

            // Create a new canvas for the transformed image using actual camera resolution
            const transformedCanvas = document.createElement('canvas');
            transformedCanvas.width = actualWidth;
            transformedCanvas.height = actualHeight;
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
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to apply ${filterType}: ${errMsg}. Using original photo.`);
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

        // Determine target size based on actual camera resolution
        const video = videoRef.current;
        const track = stream?.getVideoTracks()[0];
        const settings = track?.getSettings();
        const targetW = settings?.width || video?.videoWidth || 1280;
        const targetH = settings?.height || video?.videoHeight || 960;
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
    <div className="min-h-screen pt-16 md:pt-20 pb-20 px-2 sm:px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-glow-blue mb-2">
            VIBRANIUM 5.0
          </h1>
          
        </div>

        {/* Camera and Controls Container */}
        <div className="space-y-4 sm:space-y-6 md:space-y-8">

        {/* Camera Section with Centered Buttons */}
        <div className="camera-section">
          {/* Camera Container */}
          <div 
            ref={containerRef} 
            className={`camera-container ${
              isMobile 
                ? mobileOrientation === 'portrait' 
                  ? 'aspect-[3/4]' 
                  : 'aspect-[4/3]'
                : 'aspect-[4/3]'
            }`}
            style={{
              // Add background for mobile selfie view to prevent black bars
              backgroundColor: isMobile && facingMode === "user" ? '#1a1a1a' : 'transparent'
            }}
          >
        {!capturedImage ? (
            <>
              {/* Video Element - Bottom Layer (z-index: 1) */}
              <video
                id="cameraPreview"
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute top-0 left-0 w-full h-full transition-all duration-500 ${
                  cameraActive ? 'opacity-100 animate-fade-in' : 'opacity-0 pointer-events-none'
                }`}
                style={{
                  transform: mirrorCamera ? 'scaleX(-1)' : 'scaleX(1)',
                  filter: FILTERS.find(f => f.id === selectedFilter)?.css || 'none',
                  zIndex: 1,
                  // Use object-fit: contain to maintain 4:3 aspect ratio without cropping
                  objectFit: 'contain',
                  aspectRatio: '4 / 3',
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
                className={`absolute top-2 left-2 sm:top-4 sm:left-4 backdrop-blur-sm border transition-all duration-300 hover:scale-110 ${
                  cameraActive 
                    ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(0,217,255,0.6)] text-primary' 
                    : 'bg-background/50 border-muted-foreground/20 text-muted-foreground/50'
                }`}
                style={{ zIndex: 10 }}
              >
                <Power className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${cameraActive ? 'animate-pulse' : ''}`} />
              </Button>

              {cameraActive && (
                <>
                  {/* Holographic Overlay - z-index: 3 */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-accent/10 pointer-events-none"
                    style={{ zIndex: 3 }}
                  />
                  
                  {/* Camera Switch Button - z-index: 10 */}
                  <Button
                    onClick={switchCamera}
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 box-glow-blue backdrop-blur-sm bg-background/50 border border-primary/30"
                    style={{ zIndex: 10 }}
                  >
                    <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </Button>
                  
                  {/* Mirror Toggle Button - z-index: 10 */}
                  <Button
                    onClick={() => setMirrorCamera(!mirrorCamera)}
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-12 sm:top-4 sm:right-20 box-glow-blue backdrop-blur-sm bg-background/50 border border-primary/30"
                    style={{ zIndex: 10 }}
                  >
                    <FlipHorizontal className={`w-4 h-4 sm:w-5 sm:h-5 ${mirrorCamera ? 'text-primary' : 'text-muted-foreground'}`} />
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
                    {isMobile && (
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        📱 Optimized for mobile with 4:3 aspect ratio
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Corner Accents - z-index: 4 */}
              <div className="absolute top-1 left-1 sm:top-2 sm:left-2 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-l-2 sm:border-l-4 border-t-2 sm:border-t-4 border-primary box-glow-blue" style={{ zIndex: 4 }} />
              <div className="absolute top-1 right-1 sm:top-2 sm:right-2 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-r-2 sm:border-r-4 border-t-2 sm:border-t-4 border-primary box-glow-blue" style={{ zIndex: 4 }} />
              <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-l-2 sm:border-l-4 border-b-2 sm:border-b-4 border-accent box-glow-purple" style={{ zIndex: 4 }} />
              <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-r-2 sm:border-r-4 border-b-2 sm:border-b-4 border-accent box-glow-purple" style={{ zIndex: 4 }} />
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
                <p className="text-center font-display text-lg text-primary text-glow-blue">
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

        {/* Button Group - Perfectly Centered */}
        <div className="button-group">
          {!capturedImage ? (
            <>
              {/* Filter Button */}
              {cameraActive && (
                <>
                  <button
                    id="filters-btn"
                    onClick={() => setShowFilters(!showFilters)}
                    disabled={isProcessingAI}
                    className="vibranium-button filters-button"
                  >
                    🎨 Filters {FILTERS.find(f => f.id === selectedFilter)?.icon}
                  </button>
                  
                  {showFilters && (
                    <div className="filter-options">
                      {FILTERS.map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => {
                            setSelectedFilter(filter.id);
                            toast.success(
                              filter.isAI 
                                ? `${filter.name} will be applied after capture!` 
                                : `${filter.name} filter applied!`
                            );
                          }}
                          disabled={isProcessingAI}
                          className={`filter-option ${selectedFilter === filter.id ? 'active' : ''}`}
                        >
                          <span className="filter-icon">{filter.icon}</span>
                          <span className="filter-name">{filter.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* Capture Button */}
              <button
                id="capture-btn"
                onClick={capturePhoto}
                disabled={!cameraActive || isProcessingAI}
                className="vibranium-button capture-button"
              >
                📸 {isProcessingAI ? "Processing..." : "Capture Photo"}
              </button>
              
              {/* Upload Button */}
              <button
                id="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                className="vibranium-button upload-button"
              >
                ⬆️ Upload Photo
              </button>
              
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
              {/* Download Button */}
              <button
                id="download-btn"
                onClick={downloadPhoto}
                className="vibranium-button download-button"
              >
                💾 Save and Download Photo
              </button>
              
              {/* Retake Button */}
              <button
                id="retake-btn"
                onClick={retakePhoto}
                className="vibranium-button retake-button"
              >
                🔄 Retake
              </button>
            </>
          )}
        </div>
        </div>
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
