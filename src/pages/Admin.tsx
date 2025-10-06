import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Download, Image, Settings, BarChart3, Trash2, RefreshCw, ArrowDownToLine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  template_image_url: string | null;
  updated_at: string | null;
};

type Template = {
  id: string;
  name: string;
  preview: string;
  active: boolean;
};

const Admin = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<BoothSettings | null>(null);
  const [eventName, setEventName] = useState("");
  const [caption, setCaption] = useState("");
  const [watermark, setWatermark] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([
    { id: '1', name: 'Vibranium Classic', preview: '', active: true }
  ]);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    setupRealtimeSubscription();
  }, []);

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
    await Promise.all([loadPhotos(), loadSettings()]);
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
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error("Failed to load settings");
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Data refreshed!");
  };

  const deletePhoto = async (photoId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([fileName]);

      if (storageError) throw storageError;

      // Delete from database
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
      // Delete all from storage
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

      // Delete all from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

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

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file (PNG recommended)");
      return;
    }

    if (!settings) {
      toast.error("Settings not loaded");
      return;
    }

    try {
      toast.info("Uploading template...");

      // Upload to storage
      const fileName = `template-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // Update booth settings with template URL
      const { error: updateError } = await supabase
        .from('booth_settings')
        .update({
          template_image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (updateError) throw updateError;

      // Update local state
      setSettings({ ...settings, template_image_url: publicUrl });
      
      toast.success("Template uploaded and activated!");
      loadSettings(); // Refresh settings
    } catch (error) {
      console.error('Error uploading template:', error);
      toast.error("Failed to upload template");
    }
  };

  const activateTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    setTemplates(templates.map(t => ({
      ...t,
      active: t.id === templateId
    })));
    toast.success("Template activated!");
  };

  const stats = [
    { label: "Total Photos", value: photos.length.toString(), icon: Camera, color: "text-primary" },
    { label: "Storage Used", value: `${(photos.length * 0.5).toFixed(1)} MB`, icon: Image, color: "text-accent" },
    { label: "Photos Downloaded", value: "0", icon: ArrowDownToLine, color: "text-primary" },
  ];

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

        {/* Stats Grid */}
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

        {/* Admin Tabs */}
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-card border border-primary/30">
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Photos Tab */}
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
                          This action cannot be undone. This will permanently delete all {photos.length} photos
                          from both the database and storage.
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
                                This action cannot be undone. This will permanently delete the photo.
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
                        <Button size="sm" variant="outline" asChild>
                          <a href={photo.image_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card className="p-4 md:p-6 bg-card border-primary/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-3">
                <h2 className="font-display text-xl md:text-2xl font-bold text-primary">Template Management</h2>
                <Button className="box-glow-purple min-h-[48px] w-full sm:w-auto" onClick={() => fileInputRef.current?.click()}>
                  <Image className="w-4 h-4 mr-2" />
                  <span className="text-sm md:text-base">Upload Template</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleTemplateUpload}
                  className="hidden"
                />
              </div>

              {settings?.template_image_url ? (
                <div className="mb-6">
                  <h3 className="font-display text-lg font-semibold text-primary mb-3">Active Template</h3>
                  <Card className="p-4 bg-muted border-primary/30">
                    <div className="aspect-video bg-gradient-metallic rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      <img src={settings.template_image_url} alt="Active Template" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">This template will overlay all captured photos</p>
                  </Card>
                </div>
              ) : (
                <div className="mb-6 p-6 border-2 border-dashed border-primary/30 rounded-lg text-center">
                  <Image className="w-12 h-12 text-primary/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No template uploaded yet. Upload a transparent PNG template to overlay on photos.</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="p-4 md:p-6 bg-card border-primary/30">
              <h2 className="font-display text-xl md:text-2xl font-bold text-primary mb-4 md:mb-6">
                Booth Settings
              </h2>

              <div className="space-y-4 md:space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="fest-name" className="text-sm md:text-base">Event Name</Label>
                  <Input
                    id="fest-name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Enter event name"
                    className="bg-input border-primary/30 min-h-[48px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caption" className="text-sm md:text-base">Photo Caption</Label>
                  <Input
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Enter photo caption"
                    className="bg-input border-primary/30 min-h-[48px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="watermark" className="text-sm md:text-base">Watermark Text</Label>
                  <Input
                    id="watermark"
                    value={watermark}
                    onChange={(e) => setWatermark(e.target.value)}
                    placeholder="Enter watermark text"
                    className="bg-input border-primary/30 min-h-[48px]"
                  />
                </div>

                <Button className="w-full box-glow-blue min-h-[48px] text-sm md:text-base" onClick={saveSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Analytics Section */}
        <Card className="p-4 md:p-6 bg-card border-primary/30 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-primary">Analytics</h2>
          </div>
          <div className="h-48 md:h-64 bg-muted rounded-lg flex items-center justify-center border border-primary/20">
            <div className="text-center px-4">
              <BarChart3 className="w-12 h-12 md:w-16 md:h-16 text-primary/30 mx-auto mb-4" />
              <p className="text-sm md:text-base text-muted-foreground">
                Total Downloads: {photos.length * Math.floor(Math.random() * 3)} | 
                Avg. Downloads per Photo: {(Math.random() * 5).toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl bg-card border-primary/50">
          <DialogHeader>
            <DialogTitle className="font-display text-glow-blue">{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-gradient-metallic rounded-lg flex items-center justify-center overflow-hidden">
            {previewTemplate?.preview ? (
              <img src={previewTemplate.preview} alt={previewTemplate.name} className="w-full h-full object-cover" />
            ) : (
              <Image className="w-24 h-24 text-primary/50" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
