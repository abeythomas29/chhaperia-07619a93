import { supabase } from "@/integrations/supabase/client";

const OFFLINE_QUEUE_KEY = "chhaperia_offline_sync_queue";

export interface OfflineEntry {
    id: string; // temporary local id
    payload: any;
    timestamp: number;
}

export const saveOfflineEntry = (payload: any) => {
    const currentQueueStr = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: OfflineEntry[] = currentQueueStr ? JSON.parse(currentQueueStr) : [];

    const entry: OfflineEntry = {
        id: crypto.randomUUID(),
        payload,
        timestamp: Date.now(),
    };

    queue.push(entry);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return entry;
};

export const getOfflineQueue = (): OfflineEntry[] => {
    const str = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return str ? JSON.parse(str) : [];
};

export const clearOfflineEntry = (id: string) => {
    const queue = getOfflineQueue();
    const newQueue = queue.filter((e) => e.id !== id);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
};

export const autoSyncPendingEntries = async () => {
    if (!navigator.onLine) return;

    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`Attempting to sync ${queue.length} offline entries...`);

    // Create a copy of the payload to process them sequentially
    for (const entry of queue) {
        try {
            const { error } = await supabase.from("production_entries").insert(entry.payload);
            if (!error) {
                console.log(`Successfully synced offline entry ${entry.id}`);
                clearOfflineEntry(entry.id);
            } else {
                console.error(`Failed to sync entry ${entry.id}:`, error);
            }
        } catch (err) {
            console.error(`Error syncing entry ${entry.id}:`, err);
        }
    }
};
