import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Download, Image, Settings, Trash2, RefreshCw, ArrowDownToLine, Lock, ShieldAlert, Upload, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const ACCESS_CODE = "VIBRANIUM2025";
const SESSION_KEY = "vibranium_admin_access";

type Photo = {
  id: string;
  image_url: string;
  created_at: string;
  approved: boolean;
};

type BoothSettings = {
  id: string;
  event_name: string | null;
  caption: string | null;
  watermark: string | null;
  updated_at: string | null;
  slideshow_duration: number | null;
  slideshow_animation: string | null;
  slideshow_enabled: boolean | null;
  slideshow_caption_enabled: boolean | null;
};

type Template = {
  id: string;
  name: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const Admin = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [showError, setShowError] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<BoothSettings | null>(null);
  const [eventName, setEventName] = useState("");
  const [caption, setCaption] = useState("");
  const [watermark, setWatermark] = useState("");
  const [slideshowDuration, setSlideshowDuration] = useState(5);
  const [slideshowAnimation, setSlideshowAnimation] = useState("fade");
  const [slideshowEnabled, setSlideshowEnabled] = useState(true);
  const [slideshowCaptionEnabled, setSlideshowCaptionEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const templateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasAccess = sessionStorage.getItem(SESSION_KEY);
    if (hasAccess === ACCESS_CODE) {
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      loadData();
      setupRealtimeSubscription();
    }
  }, [isUnlocked]);

  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === ACCESS_CODE) {
      sessionStorage.setItem(SESSION_KEY, ACCESS_CODE);
      setIsUnlocked(true);
      setShowError(false);
      toast.success("Access granted! Welcome to the Admin Panel.");
    } else {
      setShowError(true);
      setAccessCode("");
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-photos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photos'
        },
        () => {
          loadPhotos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPhotos(), loadSettings(), loadTemplates()]);
    setLoading(false);
  };

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setPhotos(data);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error("Failed to load photos");
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('booth_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setSettings(data);
        setEventName(data.event_name || "");
        setCaption(data.caption || "");
        setWatermark(data.watermark || "");
        setSlideshowDuration(data.slideshow_duration || 5);
        setSlideshowAnimation(data.slideshow_animation || "fade");
        setSlideshowEnabled(data.slideshow_enabled ?? true);
        setSlideshowCaptionEnabled(data.slideshow_caption_enabled ?? true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error("Failed to load settings");
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error("Failed to load templates");
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Data refreshed!");
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("png")) {
      toast.error("Template must be a PNG file with transparency");
      return;
    }

    try {
      const fileName = `template-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, file, {
          contentType: "image/png",
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      const templateName = prompt("Enter template name:") || "Untitled Template";

      const { error: dbError } = await supabase
        .from("templates")
        .insert({
          name: templateName,
          image_url: publicUrl,
          is_active: false,
        });

      if (dbError) throw dbError;

      toast.success("Template uploaded successfully!");
      loadTemplates();
    } catch (error) {
      console.error("Error uploading template:", error);
      toast.error("Failed to upload template");
    }
  };

  const activateTemplate = async (id: string) => {
    try {
      await supabase.from("templates").update({ is_active: false }).neq("id", id);
      
      const { error } = await supabase
        .from("templates")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw error;

      toast.success("Template activated!");
      loadTemplates();
    } catch (error) {
      console.error("Error activating template:", error);
      toast.error("Failed to activate template");
    }
  };

  const deleteTemplate = async (id: string, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const fileName = imageUrl.split("/").pop();
      if (fileName) {
        await supabase.storage.from("photos").remove([fileName]);
      }

      const { error } = await supabase.from("templates").delete().eq("id", id);

      if (error) throw error;

      toast.success("Template deleted!");
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const deletePhoto = async (photoId: string, imageUrl: string) => {
    try {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([fileName]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      toast.success("Photo deleted successfully!");
      loadPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error("Failed to delete photo");
    }
  };

  const deleteAllPhotos = async () => {
    try {
      const { data: files } = await supabase.storage
        .from('photos')
        .list();

      if (files && files.length > 0) {
        const filePaths = files.map(file => file.name);
        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove(filePaths);

        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (dbError) throw dbError;

      toast.success("All photos deleted successfully!");
      loadPhotos();
    } catch (error) {
      console.error('Error deleting all photos:', error);
      toast.error("Failed to delete all photos");
    }
  };

  const exportAllPhotos = async () => {
    if (photos.length === 0) {
      toast.error("No photos to export");
      return;
    }
    
    toast.info("Preparing photos for export...");
    photos.forEach((photo, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = photo.image_url;
        link.download = `vibranium-photo-${index + 1}.png`;
        link.click();
      }, index * 200);
    });
    toast.success(`Exporting ${photos.length} photos!`);
  };

  const saveSettings = async () => {
    if (!settings) {
      toast.error("Settings not loaded");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('booth_settings')
        .update({
          event_name: eventName,
          caption: caption,
          watermark: watermark,
          slideshow_duration: slideshowDuration,
          slideshow_animation: slideshowAnimation,
          slideshow_enabled: slideshowEnabled,
          slideshow_caption_enabled: slideshowCaptionEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings");
    }
  };

  const stats = [
    { label: "Total Photos", value: photos.length.toString(), icon: Camera, color: "text-primary" },
    { label: "Templates", value: templates.length.toString(), icon: Image, color: "text-accent" },
    { label: "Storage Used", value: `${(photos.length * 0.5).toFixed(1)} MB`, icon: ArrowDownToLine, color: "text-primary" },
  ];

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="w-full max-w-md">
          <Card className="p-8 bg-card/80 backdrop-blur-sm border-2 border-primary/30 box-glow-blue">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4 relative">
                <Lock className="w-10 h-10 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-glow-blue mb-2">
                RESTRICTED ACCESS
              </h1>
              <p className="text-muted-foreground text-sm">
                Vibranium 5.0 Admin Portal
              </p>
            </div>

            <form onSubmit={handleAccessSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="access-code" className="text-foreground">
                  Enter Access Code
                </Label>
                <Input
                  id="access-code"
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-input border-primary/30 text-foreground placeholder:text-muted-foreground min-h-[48px] font-mono text-center text-lg tracking-widest"
                  autoFocus
                />
              </div>

              {showError && (
                <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive animate-fade-in">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0" />
                    <div>
                      <p className="font-display text-destructive font-semibold text-sm">
                        ACCESS DENIED
                      </p>
                      <p className="text-destructive/80 text-xs">
                        Unauthorized Entry — Invalid Code
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full box-glow-blue font-display text-lg min-h-[48px]"
              >
                <Lock className="w-4 h-4 mr-2" />
                Unlock Admin Panel
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-primary/20">
              <p className="text-center text-xs text-muted-foreground">
                Authorized Personnel Only
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 md:pt-20 pb-20 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-glow-blue mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Manage your Vibranium 5.0 Photo Booth</p>
          </div>
          <Button onClick={refreshData} variant="outline" disabled={refreshing} className="min-h-[48px] w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 md:mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-4 md:p-6 bg-card border-primary/30 hover:border-primary/60 transition-all">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color}`} />
                <span className={`font-display text-2xl md:text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-card border border-primary/30">
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
          </TabsList>

          <TabsContent value="photos">
            <Card className="p-4 md:p-6 bg-card border-primary/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-4">
                <h2 className="font-display text-xl md:text-2xl font-bold text-primary">Photo Gallery</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button className="box-glow-blue min-h-[48px]" onClick={exportAllPhotos} disabled={photos.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    <span className="text-sm md:text-base">Export All ({photos.length})</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={photos.length === 0} className="min-h-[48px]">
                        <Trash2 className="w-4 h-4 mr-2" />
                        <span className="text-sm md:text-base">Delete All</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[90vw] md:max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-base md:text-lg">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm md:text-base">
                          This action cannot be undone. This will permanently delete all {photos.length} photos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="min-h-[48px]">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteAllPhotos} className="min-h-[48px]">Delete All</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {photos.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No photos yet. Photos will appear here when users capture them.
                  </div>
                ) : (
                  photos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square rounded-lg bg-muted border border-primary/20 overflow-hidden">
                      <img src={photo.image_url} alt="Gallery" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePhoto(photo.id, photo.image_url)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card className="p-4 md:p-6 bg-card border-primary/30">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="font-display text-xl md:text-2xl font-bold text-primary">
                  Template Gallery
                </h2>
                <Button
                  onClick={() => templateInputRef.current?.click()}
                  className="box-glow-blue font-display min-h-[48px]"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Template
                </Button>
                <input
                  ref={templateInputRef}
                  type="file"
                  accept="image/png"
                  onChange={handleTemplateUpload}
                  className="hidden"
                />
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No templates uploaded yet. Upload transparent PNG overlays.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        template.is_active
                          ? "border-primary shadow-[0_0_20px_rgba(0,217,255,0.5)]"
                          : "border-muted-foreground/20"
                      }`}
                    >
                      <div className="aspect-square bg-black/50">
                        <img
                          src={template.image_url}
                          alt={template.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-4 space-y-2">
                        <p className="font-display text-sm text-primary">
                          {template.name}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => activateTemplate(template.id)}
                            disabled={template.is_active}
                            size="sm"
                            className="box-glow-blue"
                          >
                            {template.is_active ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Active
                              </>
                            ) : (
                              "Activate"
                            )}
                          </Button>
                          <Button
                            onClick={() => deleteTemplate(template.id, template.image_url)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {template.is_active && (
                        <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded-md text-xs font-display">
                          ACTIVE
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-4 md:p-6 bg-card border-primary/30">
              <h2 className="font-display text-xl md:text-2xl font-bold text-primary mb-4 md:mb-6">Booth Settings</h2>
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="event-name">Event Name</Label>
                  <Input
                    id="event-name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g., Vibranium 5.0"
                    className="min-h-[48px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caption">Caption Text</Label>
                  <Input
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g., I HAVE PARTICIPATED"
                    className="min-h-[48px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="watermark">Watermark</Label>
                  <Input
                    id="watermark"
                    value={watermark}
                    onChange={(e) => setWatermark(e.target.value)}
                    placeholder="e.g., VIBRANIUM 5.0"
                    className="min-h-[48px]"
                  />
                </div>
                <Button onClick={saveSettings} className="box-glow-blue w-full sm:w-auto min-h-[48px]">
                  <Settings className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="display">
            <Card className="p-4 md:p-6 bg-card border-primary/30">
              <h2 className="font-display text-xl md:text-2xl font-bold text-primary mb-4 md:mb-6">Display Settings</h2>
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="slideshow-duration">Transition Duration (seconds)</Label>
                  <Input
                    id="slideshow-duration"
                    type="number"
                    min="1"
                    max="60"
                    value={slideshowDuration}
                    onChange={(e) => setSlideshowDuration(Number(e.target.value))}
                    className="min-h-[48px]"
                  />
                  <p className="text-xs text-muted-foreground">How long each photo displays before transitioning</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slideshow-animation">Animation Type</Label>
                  <select
                    id="slideshow-animation"
                    value={slideshowAnimation}
                    onChange={(e) => setSlideshowAnimation(e.target.value)}
                    className="w-full min-h-[48px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="zoom">Zoom</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 border border-primary/20 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Show Caption Overlay</Label>
                    <p className="text-xs text-muted-foreground">Display event name and caption on slideshow</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={slideshowCaptionEnabled}
                    onChange={(e) => setSlideshowCaptionEnabled(e.target.checked)}
                    className="w-10 h-10 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                  <p className="font-display text-sm text-primary">📺 Display Mode URL</p>
                  <p className="text-xs text-muted-foreground">Open this link on projectors or LED screens:</p>
                  <code className="block bg-card p-2 rounded text-xs break-all border border-primary/30">
                    {window.location.origin}/slideshow
                  </code>
                </div>

                <Button onClick={saveSettings} className="box-glow-blue w-full sm:w-auto min-h-[48px]">
                  <Settings className="w-4 h-4 mr-2" />
                  Save Display Settings
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
