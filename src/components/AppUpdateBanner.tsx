import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CURRENT_VERSION_CODE, PLAY_STORE_URL } from "@/config/version";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionRow {
  version_code: number;
  version_name: string;
  min_version_code: number;
  update_url: string;
  force_update: boolean;
}

export default function AppUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionRow | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem("update_banner_dismissed") === "true";
    if (isDismissed) {
      setDismissed(true);
    }

    const checkVersion = async () => {
      try {
        // Query the database for the latest version row
        const { data, error } = await supabase
          .from("app_versions" as any)
          .select("version_code, version_name, min_version_code, update_url, force_update")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          // Fail silently, database schema migration might not be deployed yet
          console.warn("AppUpdateBanner: Unable to query app_versions table.", error.message);
          return;
        }

        if (data) {
          const info = data as unknown as VersionRow;
          setVersionInfo(info);
          
          if (info.version_code > CURRENT_VERSION_CODE) {
            setUpdateAvailable(true);
          }
        }
      } catch (err) {
        console.error("AppUpdateBanner: Unexpected error during version check.", err);
      }
    };

    // Check version on launch after a small delay
    const timer = setTimeout(checkVersion, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    const url = versionInfo?.update_url || PLAY_STORE_URL;
    if ((window as any).cordova || (window as any).Capacitor) {
      // In Capacitor app context, open in system browser or Play Store app
      window.open(url, "_system");
    } else {
      // Regular web context
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("update_banner_dismissed", "true");
  };

  // If no update is available, it was dismissed, or we don't have version info yet, render nothing
  const shouldShow = updateAvailable && versionInfo && (!dismissed || versionInfo.force_update);
  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-4 md:max-w-md animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
      <div className={cn(
        "relative overflow-hidden rounded-2xl border bg-background/80 backdrop-blur-xl p-5 shadow-2xl transition-all duration-300 border-indigo-500/30",
        "after:absolute after:inset-0 after:rounded-2xl after:bg-gradient-to-tr after:from-indigo-500/5 after:to-purple-500/5 after:pointer-events-none"
      )}>
        {/* Glow decoration */}
        <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none animate-pulse" />
        
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          
          <div className="flex-1 space-y-1 pr-6">
            <h3 className="font-bold text-sm text-foreground">New Update Available!</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Version {versionInfo.version_name} is now available on Google Play. Update to get the latest features and bug fixes.
            </p>
            
            <div className="flex items-center gap-2 pt-3">
              <Button 
                onClick={handleUpdate} 
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Update Now
              </Button>
              
              {!versionInfo.force_update && (
                <Button 
                  onClick={handleDismiss} 
                  variant="ghost" 
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Later
                </Button>
              )}
            </div>
          </div>

          {!versionInfo.force_update && (
            <button 
              onClick={handleDismiss}
              className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              aria-label="Dismiss update notification"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
