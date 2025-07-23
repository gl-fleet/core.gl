import * as turf from '@turf/turf'

const clear_noise = () => {

    // Duration between updatedAt < clear the noise >
    // Bounce between east / north speed ... 
    // Speed and Heading sudden changes

}

type TelemetryPoint = {
    timestamp: number; // Unix timestamp in seconds
    east: number;
    north: number;
    elevation: number;
    heading: number; // Degrees
    speed: number;   // m/s
};

type ActivitySegment = {
    type: string;
    startTime: number;
    endTime: number;
    durationSec: number;
    distanceMeters: number;
}

function calculateDistance(p1: TelemetryPoint, p2: TelemetryPoint): number {
    const from = turf.point([p1.east, p1.north]);
    const to = turf.point([p2.east, p2.north]);
    return turf.distance(from, to, { units: 'meters' });
}

function headingDifference(h1: number, h2: number): number {
    const diff = Math.abs(h1 - h2) % 360;
    return diff > 180 ? 360 - diff : diff;
}

function detectActivities(data: TelemetryPoint[]): ActivitySegment[] {
    const result: ActivitySegment[] = [];
    if (data.length < 2) return result;

    let currentActivity = '';
    let segmentStart = data[0];
    let segmentDistance = 0;

    for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const curr = data[i];
        const dt = curr.timestamp - prev.timestamp;

        const dist = calculateDistance(prev, curr);
        const speed = curr.speed;

        let activity = '';

        if (speed < 0.5) {
            activity = 'Idle';
        } else {
            const moveDirection = turf.bearing(turf.point([prev.east, prev.north]), turf.point([curr.east, curr.north]));
            const headingDiff = headingDifference(curr.heading, moveDirection);

            if (headingDiff > 130) {
                activity = 'Backing';
            } else {
                const headingRate = headingDifference(curr.heading, prev.heading) / dt;
                if (headingRate > 15) {
                    activity = 'Cornering';
                } else {
                    activity = 'Hauling';
                }
            }
        }

        if (activity !== currentActivity && currentActivity !== '') {
            result.push({
                type: currentActivity,
                startTime: segmentStart.timestamp,
                endTime: prev.timestamp,
                durationSec: prev.timestamp - segmentStart.timestamp,
                distanceMeters: segmentDistance,
            });
            segmentStart = prev;
            segmentDistance = 0;
        }

        segmentDistance += dist;
        currentActivity = activity;
    }

    // Add last segment
    const last = data[data.length - 1];
    result.push({
        type: currentActivity,
        startTime: segmentStart.timestamp,
        endTime: last.timestamp,
        durationSec: last.timestamp - segmentStart.timestamp,
        distanceMeters: segmentDistance,
    });

    return result;
}