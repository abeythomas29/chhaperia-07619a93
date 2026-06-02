import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OfflineQueueItem {
  id: string; // client-generated temporary UUID/string
  table: string; // e.g. "production_entries"
  payload: any; // payload to insert
  timestamp: number;
  tempId?: string; // If this item creates a new resource, this is its temporary ID
}

let isSyncing = false;
const listeners = new Set<(pendingCount: number, isSyncing: boolean) => void>();

// Helper to check if an error is network-related
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  if (error.status === 0 || error.status === undefined) return true;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network error") ||
    msg.includes("load failed") ||
    msg.includes("networkrequestfailed") ||
    msg.includes("unreachable")
  );
}

// Get queue from localStorage
export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem("chhaperia_offline_queue");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse offline queue", e);
    return [];
  }
}

// Save queue to localStorage
export function saveOfflineQueue(queue: OfflineQueueItem[]) {
  localStorage.setItem("chhaperia_offline_queue", JSON.stringify(queue));
  notifyListeners();
}

// Get ID mappings from localStorage
export function getIdMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem("chhaperia_offline_id_map");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to parse ID map", e);
    return {};
  }
}

// Save ID mappings to localStorage
export function saveIdMap(map: Record<string, string>) {
  localStorage.setItem("chhaperia_offline_id_map", JSON.stringify(map));
}

// Queue an entry
export function queueOfflineEntry(table: string, payload: any, tempId?: string) {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    table,
    payload,
    timestamp: Date.now(),
    tempId,
  };
  queue.push(newItem);
  saveOfflineQueue(queue);

  // Soft toast notice
  toast.success("Saved offline", {
    description: "Your entry has been saved locally and will sync when network is back.",
    duration: 5000,
  });

  // Attempt sync immediately in case network is actually working but slow
  triggerSync();
}

// Replace any occurrence of a temporary UUID with its real database ID in a payload
export function replaceTempIds(obj: any, idMap: Record<string, string>): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return idMap[obj] || obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => replaceTempIds(item, idMap));
  }
  if (typeof obj === "object") {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = replaceTempIds(obj[key], idMap);
    }
    return res;
  }
  return obj;
}

// Notify all subscribers of queue/sync state changes
function notifyListeners() {
  const count = getOfflineQueue().length;
  listeners.forEach(l => l(count, isSyncing));
}

// Subscribe to sync state changes
export function subscribeToSync(listener: (pendingCount: number, isSyncing: boolean) => void) {
  listeners.add(listener);
  listener(getOfflineQueue().length, isSyncing);
  return () => {
    listeners.delete(listener);
  };
}

// Main sync runner
export async function syncPendingEntries(): Promise<boolean> {
  if (isSyncing) return false;
  const queue = getOfflineQueue();
  if (queue.length === 0) return false;

  // Check connectivity
  if (!navigator.onLine) {
    console.log("Offline sync skipped: browser reports offline status");
    return false;
  }

  isSyncing = true;
  notifyListeners();

  let successCount = 0;
  let hasNetworkFailure = false;
  const idMap = getIdMap();

  try {
    toast.info("Offline Sync", {
      description: `Attempting to sync ${queue.length} pending entries...`,
      duration: 3000,
    });

    // Process sequentially to preserve dependent insert references
    while (queue.length > 0) {
      const item = queue[0];
      // 1. Swap any temporary IDs in the payload with actual database IDs resolved so far
      const finalPayload = replaceTempIds(item.payload, idMap);

      console.log(`Syncing table ${item.table} with payload:`, finalPayload);

      let insertError = null;
      let insertedRows: any[] | null = null;

      try {
        let query = supabase.from(item.table).insert(finalPayload);
        
        // Always select returned columns to retrieve generated UUID/BigInt IDs
        query = query.select();
        
        const { data, error } = await query;
        insertError = error;
        insertedRows = data;
      } catch (err) {
        insertError = err;
      }

      if (insertError) {
        // Handle slitting fallback if 'gsm' column is not supported in slitting_entries
        if (
          item.table === "slitting_entries" &&
          insertError.code === "PGRST204" &&
          String(insertError.message).includes("'gsm' column")
        ) {
          console.warn("Slitting table column missing gsm column, retrying fallback");
          try {
            const fallbackPayload = Array.isArray(finalPayload)
              ? finalPayload.map(({ gsm, ...rest }: any) => rest)
              : (() => { const { gsm, ...rest } = finalPayload; return rest; })();
            const { data, error } = await supabase.from(item.table).insert(fallbackPayload).select();
            insertError = error;
            insertedRows = data;
          } catch (fallbackErr) {
            insertError = fallbackErr;
          }
        }
      }

      if (insertError) {
        if (isNetworkError(insertError)) {
          console.warn("Offline sync paused: Network error encountered", insertError);
          hasNetworkFailure = true;
          break; // Stop sync immediately to retry later
        } else {
          // Validation error or unique constraint conflict
          console.error(`Offline sync entry failed permanently for table ${item.table}:`, insertError);
          toast.error("Sync entry skipped", {
            description: `Could not save offline data to ${item.table}: ${insertError.message || "Database error"}`,
            duration: 6000,
          });
          // Remove from queue so it does not block subsequent entries indefinitely
          queue.shift();
          saveOfflineQueue(queue);
        }
      } else {
        // Success! 
        successCount++;
        const createdRow = insertedRows?.[0];
        
        // If this item generated a new ID and had a temporary ID assigned, register it in our map
        if (item.tempId && createdRow && createdRow.id) {
          idMap[item.tempId] = createdRow.id;
          saveIdMap(idMap);
          console.log(`Mapped temporary ID ${item.tempId} -> Database ID ${createdRow.id}`);
        }

        // Remove successfully processed item
        queue.shift();
        saveOfflineQueue(queue);
      }
    }

    if (successCount > 0) {
      toast.success("Sync completed", {
        description: `Successfully synchronized ${successCount} entries to the database.`,
        duration: 4000,
      });
    }
  } catch (err) {
    console.error("Fatal error during sync", err);
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  return !hasNetworkFailure;
}

// Thread-safe wrapper to trigger sync background tasks safely
export function triggerSync() {
  setTimeout(() => {
    syncPendingEntries().catch(e => console.error("Auto-sync background error", e));
  }, 100);
}

// Background listeners setup
if (typeof window !== "undefined") {
  // Listen for online status transition
  window.addEventListener("online", () => {
    console.log("Network online detected. Triggering sync...");
    triggerSync();
  });

  // Regular periodic sync check (e.g. every 30 seconds)
  setInterval(() => {
    if (getOfflineQueue().length > 0 && navigator.onLine && !isSyncing) {
      console.log("Periodic timer triggered sync...");
      triggerSync();
    }
  }, 30000);

  // Trigger sync on window focus
  window.addEventListener("focus", () => {
    if (getOfflineQueue().length > 0) {
      triggerSync();
    }
  });
}
