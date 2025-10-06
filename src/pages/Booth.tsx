import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Download, RotateCcw, FlipHorizontal, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface BoothSettings {
  event_name: string;
  caption: string;
  watermark: string;
  template_image_url: string | null;
}

const Booth = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [mirrorCamera, setMirrorCamera] = useState(true);
  const [settings, setSettings] = useState<BoothSettings | null>(null);
  const isMobile = useIsMobile();
  const [templateVersion, setTemplateVersion] = useState(0);

  // Fetch booth settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('booth_settings')
        .select('event_name, caption, watermark, template_image_url')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load booth settings');
        return;
      }

      if (data) {
        setSettings(data);
        setTemplateVersion(Date.now());
      }
    };

    fetchSettings();

    // Setup realtime subscription for settings updates
    const channel = supabase
      .channel('booth-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'booth_settings'
        },
        (payload) => {
          setSettings(payload.new as BoothSettings);
          setTemplateVersion(Date.now());
          toast.info('Template updated!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      // Set aspect ratio based on device type
      const aspectRatio = isMobile ? 9 / 16 : 16 / 9;
      const idealWidth = isMobile ? 1080 : 1920;
      const idealHeight = isMobile ? 1920 : 1080;
      
      let mediaStream: MediaStream | null = null;
      let lastError: any = null;
      
      const constraintsList: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
          },
          audio: false,
        },
        { video: { facingMode: 'user' }, audio: false } as any,
        { video: true, audio: false },
      ];

      for (const c of constraintsList) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(c);
          break;
        } catch (e) {
          lastError = e;
          continue;
        }
      }
      if (!mediaStream) throw lastError!;

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
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera not ready. Please wait a moment.");
      return;
    }

    if (!cameraActive) {
      toast.error("Please turn on the camera first.");
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error("Failed to get canvas context");
        return;
      }

      // Step 1: Draw video frame using ImageCapture when available, fallback to <video>
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let drewVideo = false;
      const track = stream?.getVideoTracks?.()[0];
      const ImageCaptureCtor = (window as any).ImageCapture;
      if (track && ImageCaptureCtor) {
        try {
          const imageCapture = new ImageCaptureCtor(track);
          const bitmap: ImageBitmap = await imageCapture.grabFrame();
          // Resize canvas to frame size for best quality
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;

          if (mirrorCamera) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(bitmap as any, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();
          } else {
            ctx.drawImage(bitmap as any, 0, 0, canvas.width, canvas.height);
          }
          drewVideo = true;
        } catch (e) {
          console.warn('ImageCapture failed, falling back to video element', e);
        }
      }

      if (!drewVideo) {
        if (mirrorCamera) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      }

      // Step 2: Draw template overlay on top of video if exists
      if (settings?.template_image_url) {
        try {
          // Load template via blob to avoid CORS-taint on canvas
          const resp = await fetch(settings.template_image_url);
          if (!resp.ok) throw new Error('Failed to fetch template');
          
          const blob = await resp.blob();
          const objectUrl = URL.createObjectURL(blob);
          
          const templateImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load template image'));
            img.src = objectUrl;
          });
          
          // Draw template overlay covering the entire canvas
          ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(objectUrl);
        } catch (templateError) {
          console.error('Template overlay error:', templateError);
          toast.error("Failed to apply template overlay");
        }
      } else if (settings) {
        // Draw caption and watermark if no template image
        const fontSize = Math.floor(canvas.height / 20);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = '#00D9FF';
        ctx.textAlign = 'center';
        ctx.fillText(settings.caption, canvas.width / 2, canvas.height - fontSize * 3);
        
        ctx.font = `${Math.floor(fontSize * 0.7)}px Arial`;
        ctx.fillStyle = '#9333EA';
        ctx.fillText(settings.event_name, canvas.width / 2, canvas.height - fontSize * 1.5);
        
        // Watermark
        ctx.font = `${Math.floor(fontSize * 0.5)}px Arial`;
        ctx.fillStyle = '#00D9FF';
        ctx.textAlign = 'left';
        ctx.fillText(settings.watermark, 20, fontSize);
      }

      // Step 3: Convert canvas to image
      const imageData = canvas.toDataURL("image/png");
      setCapturedImage(imageData);
      toast.success("Photo captured with template!");
    } catch (error) {
      console.error('Capture error:', error);
      toast.error("Failed to capture photo");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set a consistent target size based on layout aspect ratio
      const targetW = isMobile ? 1080 : 1920;
      const targetH = isMobile ? 1920 : 1080;
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load uploaded photo
      const fileUrl = URL.createObjectURL(file);
      const photo = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load uploaded image'));
        img.src = fileUrl;
      });

      // Draw uploaded photo to cover canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.max(canvas.width / photo.width, canvas.height / photo.height);
      const dw = photo.width * scale;
      const dh = photo.height * scale;
      const dx = (canvas.width - dw) / 2;
      const dy = (canvas.height - dh) / 2;
      ctx.drawImage(photo, dx, dy, dw, dh);
      URL.revokeObjectURL(fileUrl);

      // Overlay template if available
      if (settings?.template_image_url) {
        const resp = await fetch(settings.template_image_url);
        if (resp.ok) {
          const blob = await resp.blob();
          const tplUrl = URL.createObjectURL(blob);
          const overlay = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load template image'));
            img.src = tplUrl;
          });
          ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(tplUrl);
        }
      } else if (settings) {
        // Draw captions if no template image
        const fontSize = Math.floor(canvas.height / 20);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = '#00D9FF';
        ctx.textAlign = 'center';
        ctx.fillText(settings.caption, canvas.width / 2, canvas.height - fontSize * 3);
        
        ctx.font = `${Math.floor(fontSize * 0.7)}px Arial`;
        ctx.fillStyle = '#9333EA';
        ctx.fillText(settings.event_name, canvas.width / 2, canvas.height - fontSize * 1.5);
        
        ctx.font = `${Math.floor(fontSize * 0.5)}px Arial`;
        ctx.fillStyle = '#00D9FF';
        ctx.textAlign = 'left';
        ctx.fillText(settings.watermark, 20, fontSize);
      }

      const imageData = canvas.toDataURL('image/png');
      setCapturedImage(imageData);
      toast.success('Photo uploaded and templated!');
    } catch (err) {
      console.error('Upload compose error:', err);
      toast.error('Failed to compose uploaded photo');
    }
  };

  const downloadPhoto = async () => {
    if (!capturedImage || !settings) return;

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Upload to storage
      const fileName = `${settings.event_name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
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
      document.body.appendChild(link);
      link.click();
      link.remove();
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
        <div className="relative rounded-2xl overflow-hidden border-4 border-glow aspect-[9/16] md:aspect-video mb-6 bg-metallic">
          {!capturedImage ? (
            <>
              {/* Inner capture container - only video + template overlay */}
              <div 
                ref={previewContainerRef}
                className="absolute inset-0"
              >
                {/* Video Element - Always rendered */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    cameraActive ? 'opacity-100 animate-fade-in' : 'opacity-0 pointer-events-none'
                  }`}
                  style={{
                    transform: mirrorCamera ? 'scaleX(-1)' : 'scaleX(1)',
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {cameraActive && (
                  <>
                    {/* Holographic Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-accent/10 pointer-events-none" />
                    
                    {/* Active Template Overlay */}
                    {settings ? (
                      <>
                        {/* Template Image Overlay - Full Coverage */}
                          {settings.template_image_url && (
                            <div className="absolute inset-0 pointer-events-none z-20">
                              <img 
                                key={templateVersion}
                                src={`${settings.template_image_url}?v=${templateVersion}`}
                                alt="Template Overlay" 
                                className="w-full h-full object-cover"
                                style={{ mixBlendMode: 'normal' }}
                              />
                            </div>
                          )}

                        {/* Caption Overlay - Only if no template image */}
                        {!settings.template_image_url && (
                          <>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-6 pointer-events-none z-20">
                              <p className="text-center font-display text-2xl font-bold text-glow-blue">
                                {settings.caption}
                              </p>
                              <p className="text-center font-display text-lg text-accent text-glow-purple">
                                {settings.event_name}
                              </p>
                            </div>

                            {/* Watermark */}
                            <div className="absolute top-4 left-4 bg-background/50 backdrop-blur-sm px-3 py-1 rounded-lg border border-primary/30 pointer-events-none z-20">
                              <p className="font-display text-xs text-primary">{settings.watermark}</p>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 pointer-events-none z-20">
                        <p className="font-display text-sm text-muted-foreground">No active template set by admin</p>
                      </div>
                    )}
                  </>
                )}
                
                {!cameraActive && (
                  /* Camera Off Placeholder */
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5 animate-fade-in">
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
              </div>

              {/* UI Controls - outside capture area */}
              {/* Camera Power Toggle Button */}
              <Button
                onClick={toggleCamera}
                size="icon"
                className={`absolute top-4 left-4 backdrop-blur-sm border z-30 transition-all duration-300 hover:scale-110 ${
                  cameraActive 
                    ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(0,217,255,0.6)] text-primary' 
                    : 'bg-background/50 border-muted-foreground/20 text-muted-foreground/50'
                }`}
              >
                <Power className={`w-5 h-5 transition-all duration-300 ${cameraActive ? 'animate-pulse' : ''}`} />
              </Button>

              {/* Mirror Toggle Button */}
              {cameraActive && (
                <Button
                  onClick={() => setMirrorCamera(!mirrorCamera)}
                  size="icon"
                  variant="secondary"
                  className="absolute top-4 right-4 box-glow-blue backdrop-blur-sm bg-background/50 border border-primary/30 z-30"
                >
                  <FlipHorizontal className={`w-5 h-5 ${mirrorCamera ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>
              )}
              
              {/* Corner Accents */}
              <div className="absolute top-2 left-2 w-12 h-12 sm:w-16 sm:h-16 border-l-4 border-t-4 border-primary box-glow-blue pointer-events-none" />
              <div className="absolute top-2 right-2 w-12 h-12 sm:w-16 sm:h-16 border-r-4 border-t-4 border-primary box-glow-blue pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-12 h-12 sm:w-16 sm:h-16 border-l-4 border-b-4 border-accent box-glow-purple pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-12 h-12 sm:w-16 sm:h-16 border-r-4 border-b-4 border-accent box-glow-purple pointer-events-none" />
            </>
          ) : (
            <div className="relative w-full h-full">
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-center">
          {!capturedImage ? (
            <>
              <Button
                onClick={capturePhoto}
                disabled={!cameraActive}
                size="lg"
                className="box-glow-blue font-display text-base md:text-lg px-6 md:px-8 min-h-[48px] w-full sm:w-auto"
              >
                <Camera className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Capture Photo
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
    </div>
  );
};

export default Booth;
