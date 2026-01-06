/**
 * AlertEngine Service
 * Deterministic rule evaluation for tracking operations.
 */

// Helper: Haversine Distance (km)
function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

class AlertEngine {
    constructor() {
        this.lastPosition = null;
        this.stopStartTime = null;
        this.alerts = [];
    }

    /**
     * Evaluate rules based on new position
     * @param {Object} currentPos {lat, lng, speed}
     * @param {Object} routeInfo Optional route context
     * @param {Array} destPos Optional [lat, lng]
     */
    evaluate(currentPos, routeInfo, destPos) {
        const newAlerts = [];
        const now = Date.now();

        // RULE 1: STOP DETECTION
        // If speed < 1 km/h (approx 0.27 m/s)
        const isStopped = currentPos.speed < 1 || (currentPos.velocity && currentPos.velocity < 1);
        
        if (isStopped) {
            if (!this.stopStartTime) {
                this.stopStartTime = now;
            } else {
                const durationMinutes = (now - this.stopStartTime) / 1000 / 60;
                if (durationMinutes > 5) { // Threshold: 5 mins
                    newAlerts.push({
                        id: 'stop_detected',
                        level: 'warning',
                        message: `Stationary for ${durationMinutes.toFixed(0)} min`,
                        timestamp: now
                    });
                }
            }
        } else {
            this.stopStartTime = null; // Reset if moving
        }

        // RULE 2: DESTINATION REACHED
        if (destPos) {
            const distToDest = getDistance(currentPos.lat, currentPos.lng, destPos[0], destPos[1]);
            // Threshold: 0.05 km (50 meters)
            if (distToDest < 0.05) {
                newAlerts.push({
                    id: 'destination_reached',
                    level: 'success',
                    message: "Arrived at Destination",
                    timestamp: now
                });
            }
        }

        // RULE 3: PATH DEVIATION (Basic Check)
        // If strict routing is active and distance increases significantly vs expected?
        // Simpler: Check deviation from straight line if routing not available, 
        // OR rely on Routing Machine's off-route logic. 
        // For this task, we'll keep it simple: If speed is high (>100km/h) -> Speeding Alert
        if (currentPos.speed > 80) { // 80 km/h
             newAlerts.push({
                id: 'high_speed',
                level: 'danger',
                message: "High Speed Detected (>80km/h)",
                timestamp: now
            });
        }

        this.lastPosition = currentPos;
        return newAlerts;
    }
}

export const alertEngine = new AlertEngine();
