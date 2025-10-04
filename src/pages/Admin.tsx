import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Users, Download, Image, Settings, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Admin = () => {
  const stats = [
    { label: "Photos Taken", value: "1,247", icon: Camera, color: "text-primary" },
    { label: "Total Users", value: "892", icon: Users, color: "text-accent" },
    { label: "Downloads", value: "3,421", icon: Download, color: "text-primary" },
    { label: "Active Templates", value: "5", icon: Image, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen pt-20 pb-20 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-glow-blue mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your Vibranium 5.0 Photo Booth</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 bg-card border-primary/30 hover:border-primary/60 transition-all">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <span className={`font-display text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
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
            <Card className="p-6 bg-card border-primary/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-primary">Photo Gallery</h2>
                <Button className="box-glow-blue">
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted border border-primary/20 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary/30" />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card className="p-6 bg-card border-primary/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-primary">Template Management</h2>
                <Button className="box-glow-purple">
                  <Image className="w-4 h-4 mr-2" />
                  Upload Template
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["Vibranium Classic", "Holographic", "Neon Grid"].map((template, i) => (
                  <Card key={i} className="p-4 bg-muted border-primary/20">
                    <div className="aspect-video bg-gradient-metallic rounded-lg mb-3 flex items-center justify-center">
                      <Image className="w-12 h-12 text-primary/50" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">{template}</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        Preview
                      </Button>
                      <Button size="sm" className="flex-1 box-glow-blue">
                        Activate
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="p-6 bg-card border-primary/30">
              <h2 className="font-display text-2xl font-bold text-primary mb-6">
                Booth Settings
              </h2>

              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="fest-name">Event Name</Label>
                  <Input
                    id="fest-name"
                    defaultValue="Vibranium 5.0"
                    className="bg-input border-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caption">Photo Caption</Label>
                  <Input
                    id="caption"
                    defaultValue="I HAVE PARTICIPATED"
                    className="bg-input border-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="watermark">Watermark Text</Label>
                  <Input
                    id="watermark"
                    defaultValue="V5.0"
                    className="bg-input border-primary/30"
                  />
                </div>

                <Button className="w-full box-glow-blue">
                  <Settings className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Analytics Section */}
        <Card className="p-6 bg-card border-primary/30 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h2 className="font-display text-2xl font-bold text-primary">Analytics</h2>
          </div>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center border border-primary/20">
            <p className="text-muted-foreground">Analytics charts will appear here</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
