import { useEffect, useState } from "react";
import { subscribeToSync, triggerSync } from "@/lib/offlineSync";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SyncStatusPill() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = subscribeToSync((count, syncing) => {
      setPendingCount(count);
      setIsSyncing(syncing);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  const handleClick = () => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      triggerSync();
    }
  };

  // Determine colors, text, and icons
  let statusText = "Online";
  let statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let Icon = Wifi;
  let pulse = false;

  if (!isOnline) {
    statusText = pendingCount > 0 ? `${pendingCount} Offline` : "Offline";
    statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    Icon = WifiOff;
    pulse = pendingCount > 0;
  } else if (isSyncing) {
    statusText = `Syncing (${pendingCount})`;
    statusColor = "bg-sky-500/10 text-sky-400 border-sky-500/20";
    Icon = RefreshCw;
    pulse = true;
  } else if (pendingCount > 0) {
    statusText = `${pendingCount} Pending`;
    statusColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold";
    Icon = AlertCircle;
    pulse = true;
  } else {
    statusText = "Synced";
    statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    Icon = CheckCircle2;
  }

  return (
    <div className="relative shrink-0 select-none">
      <button
        type="button"
        onClick={handleClick}
        disabled={!isOnline || pendingCount === 0 || isSyncing}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClickCapture={handleClick}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-300",
          statusColor,
          pulse && "animate-pulse",
          isOnline && pendingCount > 0 && !isSyncing && "hover:bg-indigo-500/25 hover:text-indigo-300 border-indigo-500/40 cursor-pointer active:scale-95"
        )}
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", isSyncing && "animate-spin")} />
        <span className="hidden sm:inline">{statusText}</span>
        {pendingCount > 0 && <span className="sm:hidden font-bold">{pendingCount}</span>}
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-48 rounded-lg border border-border bg-card p-3 shadow-md text-card-foreground text-xs leading-normal animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <p className="font-bold flex items-center gap-1">
            {isOnline ? "✓ Connected" : "⚠️ Disconnected"}
          </p>
          <p className="text-muted-foreground mt-1">
            {pendingCount > 0
              ? `${pendingCount} entries are queued locally. They will automatically synchronize with Supabase once network conditions stabilize.`
              : "All data entries are fully synchronized with the database."}
          </p>
          {isOnline && pendingCount > 0 && !isSyncing && (
            <p className="text-secondary font-semibold mt-1.5 border-t border-border pt-1.5 text-center">
              Click pill to force sync!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
