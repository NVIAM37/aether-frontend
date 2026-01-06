/**
 * OfflineBuffer Service
 * Handles data persistence when network drops.
 * Uses localStorage + In-Memory Queue.
 */

class OfflineBuffer {
    constructor() {
        this.queue = [];
        this.STORAGE_KEY = "aether_offline_buffer";
        this.load();
    }

    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
            }
        } catch (e) {
            console.error("OfflineBuffer Load Error:", e);
        }
    }

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
        } catch (e) {
            console.error("OfflineBuffer Save Error:", e);
        }
    }

    /**
     * Add data to buffer
     * @param {Object} data - Location object {lat, lng, speed, timestamp}
     */
    add(data) {
        // Enforce limit to preven storage overflow
        if (this.queue.length > 500) {
            this.queue.shift(); // Drop oldest
        }
        
        const timestampedData = {
            ...data,
            _bufferedAt: Date.now(),
            _isOfflineData: true
        };
        
        this.queue.push(timestampedData);
        this.save();
        console.log(`[OfflineBuffer] Buffered point. Count: ${this.queue.length}`);
    }

    /**
     * Flush buffer to socket
     * @param {Socket} socket 
     */
    flush(socket) {
        if (!socket || !socket.connected || this.queue.length === 0) return;

        console.log(`[OfflineBuffer] Flushing ${this.queue.length} points...`);
        
        // Clone queue to iterating safely
        const bufferToSend = [...this.queue];
        
        // Emit all buffered points
        // NOTE: Server handles individual updates. We send them rapidly.
        // In a real prod env, we'd batch this. For now, we loop.
        bufferToSend.forEach(point => {
            // Re-emit as update-location
            socket.emit("update-location", {
                lat: point.lat,
                lng: point.lng,
                speed: point.speed,
                timestamp: point.timestamp // Original timestamp
            });
        });

        // Clear only if successful (assuming socket didn't crash)
        this.queue = [];
        this.save();
        console.log("[OfflineBuffer] Flush complete.");
    }

    getCount() {
        return this.queue.length;
    }
}

export const offlineBuffer = new OfflineBuffer();
