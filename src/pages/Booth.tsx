import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const Booth = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setCameraActive(true);
      toast.success("Camera activated!");
    } catch (error) {
      toast.error("Camera access denied. Use upload instead.");
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/png");
        setCapturedImage(imageData);
        toast.success("Photo captured!");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        toast.success("Photo uploaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadPhoto = async () => {
    if (!capturedImage) return;

    const downloadCanvas = document.createElement("canvas");
    const ctx = downloadCanvas.getContext("2d");
    if (!ctx) return;

    // Template dimensions (square format)
    const templateSize = 1080;
    const borderWidth = 20;
    const photoMargin = 100;
    const photoSize = templateSize - (photoMargin * 2);

    downloadCanvas.width = templateSize;
    downloadCanvas.height = templateSize;

    // Load the captured image
    const img = new Image();
    img.onload = async () => {
      // Draw black background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, templateSize, templateSize);

      // Draw cyan glowing border
      ctx.strokeStyle = "#00D9FF";
      ctx.lineWidth = borderWidth;
      ctx.shadowColor = "#00D9FF";
      ctx.shadowBlur = 30;
      ctx.strokeRect(borderWidth / 2, borderWidth / 2, templateSize - borderWidth, templateSize - borderWidth);

      // Reset shadow for photo
      ctx.shadowBlur = 0;

      // Draw the user's photo in the center
      const imgAspect = img.width / img.height;
      let drawWidth = photoSize;
      let drawHeight = photoSize;
      let offsetX = photoMargin;
      let offsetY = photoMargin;

      // Maintain aspect ratio
      if (imgAspect > 1) {
        drawHeight = photoSize / imgAspect;
        offsetY = photoMargin + (photoSize - drawHeight) / 2;
      } else {
        drawWidth = photoSize * imgAspect;
        offsetX = photoMargin + (photoSize - drawWidth) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Draw bottom text
      ctx.fillStyle = "#00D9FF";
      ctx.shadowColor = "#00D9FF";
      ctx.shadowBlur = 20;
      ctx.font = "bold 48px 'Orbitron', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("I Have Participated – Vibranium 5.0", templateSize / 2, templateSize - 80);

      // Draw watermark
      ctx.font = "bold 24px 'Orbitron', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("Vibranium 5.0", templateSize - 40, templateSize - 40);

      // Convert to blob and save to database
      downloadCanvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // Upload to storage
            const fileName = `vibranium-5.0-${Date.now()}.png`;
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
            link.click();
            URL.revokeObjectURL(url);
            
            toast.success("Photo saved and downloaded!");
          } catch (error) {
            console.error('Error saving photo:', error);
            toast.error("Failed to save photo");
          }
        }
      }, "image/png");
    };

    img.src = capturedImage;
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
          <p className="text-muted-foreground text-sm md:text-lg">AI-Powered Photo Booth Experience</p>
        </div>

        {/* Main Camera/Photo View */}
        <div className="relative rounded-2xl overflow-hidden border-4 border-glow aspect-video mb-6 bg-metallic">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Holographic Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-accent/10 pointer-events-none" />
              
              {/* Corner Accents */}
              <div className="absolute top-2 left-2 w-16 h-16 border-l-4 border-t-4 border-primary box-glow-blue" />
              <div className="absolute top-2 right-2 w-16 h-16 border-r-4 border-t-4 border-primary box-glow-blue" />
              <div className="absolute bottom-2 left-2 w-16 h-16 border-l-4 border-b-4 border-accent box-glow-purple" />
              <div className="absolute bottom-2 right-2 w-16 h-16 border-r-4 border-b-4 border-accent box-glow-purple" />
            </>
          ) : (
            <div className="relative w-full h-full">
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              
              {/* Vibranium Template Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-accent/20" />
              
              {/* Caption Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-6">
                <p className="text-center font-display text-2xl font-bold text-glow-blue">
                  I HAVE PARTICIPATED
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
