import { Link, useLocation } from "react-router-dom";
import { Camera, Grid3x3, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

const Navigation = () => {
  const location = useLocation();
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  const handleAdminAccess = () => {
    if (adminCode === "VIBRANIUM2025") {
      window.location.href = "/admin";
    } else {
      alert("Invalid code!");
      setAdminCode("");
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/50 backdrop-blur-md border-b border-primary/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-vibranium flex items-center justify-center">
                <Camera className="w-6 h-6 text-background" />
              </div>
              <h1 className="font-display font-bold text-xl text-glow-blue">VIBRANIUM 5.0</h1>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/">
                <Button
                  variant={location.pathname === "/" ? "default" : "ghost"}
                  size="sm"
                  className={location.pathname === "/" ? "box-glow-blue" : ""}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Booth
                </Button>
              </Link>
              <Link to="/feed">
                <Button
                  variant={location.pathname === "/feed" ? "default" : "ghost"}
                  size="sm"
                  className={location.pathname === "/feed" ? "box-glow-blue" : ""}
                >
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Feed
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hidden Admin Access Button */}
      <button
        onClick={() => setShowAdminDialog(true)}
        className="fixed bottom-20 right-4 w-3 h-3 rounded-full bg-primary/20 hover:bg-primary/40 transition-all duration-300 z-40"
        aria-label="Admin Access"
      />

      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="bg-card border-primary/50">
          <DialogHeader>
            <DialogTitle className="font-display text-glow-blue flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter secret code"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminAccess()}
              className="bg-input border-primary/30"
            />
            <Button onClick={handleAdminAccess} className="w-full box-glow-blue">
              Enter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navigation;
