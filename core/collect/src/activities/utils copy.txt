import { dateFormat, moment, log } from 'utils'
import * as turf from '@turf/turf'

type Vec2 = { x: number; y: number }

type VehiclePoint = {
    east: number
    north: number
    lat: number
    lon: number
    elevation: number
    heading: number
    speed: number
    updated: Date
    work?: string
    activity?: string
    seconds?: number
    meters?: number
    angle?: number
}

type ActivityPoint = {
    proj?: string, type?: string, name?: string,
    activity: string, details: string, note: string, mid: any,
    startedAt: string, start: string,
    endedAt: string, end: string,
    distance: number, duration: number, angle: number
}

// Format float
const ff = (value: number, precision: number = 2): Number => Number(value.toFixed(precision))
const f = (n: number) => n > 99 ? `${n}` : n > 9 ? `0${n}` : `00${n}`

// Euclidean distance in 2D
const distance = (a: VehiclePoint, b: VehiclePoint): number => Math.hypot(a.east - b.east, a.north - b.north)

const makeVector = (a: VehiclePoint, b: VehiclePoint): Vec2 => ({ x: b.east - a.east, y: b.north - a.north })

const signedAngleBetween = (v1: Vec2, v2: Vec2): number => {
    const dot = v1.x * v2.x + v1.y * v2.y
    const cross = v1.x * v2.y - v1.y * v2.x
    return Math.atan2(cross, dot) * (180 / Math.PI) // degrees, -180..+180
}

const headingDegrees = (A: VehiclePoint, B: VehiclePoint): number => {
    const dE = B.east - A.east
    const dN = B.north - A.north
    if (dE === 0 && dN === 0) return NaN
    const angle = Math.atan2(dE, dN) * (180 / Math.PI)
    return Math.round(angle < 0 ? angle + 360 : angle)
}

const angleToCompass8Short = (angleDeg: number): 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'Undefined' => {
    if (!isFinite(angleDeg)) return 'Undefined'
    const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
    const idx = Math.round(angleDeg / 45) % 8
    return labels[idx]
}


const unicodeArrows: any = {
    N: '↑',
    NE: '↗',
    E: '→',
    SE: '↘',
    S: '↓',
    SW: '↙',
    W: '←',
    NW: '↖',
    Undefined: '?'
}

const arrowForAngle = (angle: number): string => unicodeArrows[angleToCompass8Short(angle)]

// Parse the string into a VehiclePoint object
const parser = (samps: string[]): VehiclePoint[] => samps.map((entry, idx) => {

    const [east, north, lat, lon, elevation, heading, speed, updated, work = '-|-|-'] = entry.split(',')

    return {
        east: parseFloat(east),
        north: parseFloat(north),
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        elevation: parseFloat(elevation),
        heading: parseFloat(heading),
        speed: parseFloat(speed),
        updated: new Date(updated),
        work,
        activity: '-',
        seconds: 0,
        meters: 0,
        angle: 0,
    }

})

const detectPayloadTonnage = (name: string = '', work: string): number => { return 99 }

const __shapeActivity = (fixed: ActivityPoint[], shapes: any[], prev_activity: string = '', debug: boolean = false) => {

    debug && console.log(prev_activity)
    const mapRule: any = {
        'Load': ['Queue to Load', 'Spot at Load', 'Loading', 'Travel Loaded'],
        'Dump': ['Queue to Dump', 'Spot at Dump', 'Dumping', 'Travel Empty'],
        'Park': ['Queue to Park', 'Spot at Park', 'Parked', 'Travel Empty'],
        'Fuel': ['Queue to Fuel', 'Spot at Fuel', 'Fueling', 'Travel Empty'],
        'Maintenance': ['Queue to Maintenance', 'Spot at Maintenance', 'Maintaining', 'Travel Empty'],
        'Alert on Entry': ['Approaching hazard', 'Entering hazard', 'In hazard', 'Traveling in hazard'],
        'Alert on Exit': ['Approaching hazard', 'Exiting hazard', 'Exited hazard', 'Traveling in hazard'],
    }

    for (const c of fixed) {

        const B = c.mid
        const point = turf.point([Number(B.lat), Number(B.lon)])
        const activities: any = []

        for (const x in shapes) {

            const { name, proj, rules, connect, obj } = shapes[x]

            if (obj && obj.geometry) {

                const { type } = obj.geometry
                let distance = 0

                if (type === 'LineString') distance = turf.pointToLineDistance(point, obj, { units: "meters" })
                if (type !== 'LineString') distance = turf.pointToPolygonDistance(point, obj, { units: "meters" })
                if (type === 'LineString' && distance <= 50) activities.push({ priority: 1, name, rules, connect, distance })
                if (type !== 'LineString' && distance <= 100) activities.push({ priority: 0, name, rules, connect, distance })

            }

        }

        const sorted = activities.sort((a: any, b: any) => {

            if (a.priority !== b.priority) return a.priority - b.priority // First sort by priority ascending
            if (a.distance !== b.distance) return a.distance - b.distance // Then sort by distance ascending
            return 0

        })

        if (sorted.length > 0) {

            const curr_activity = c.activity

            const { name, rules, connect, distance, at } = sorted[0]

            debug && console.log(sorted)

            if (rules === 'Load') {

                if (curr_activity === 'idling' && distance > 0) return mapRule[rules][0] // Queue to Load
                if (curr_activity === 'moving' && distance <= 0) return mapRule[rules][1] // Spot at Load
                if (curr_activity === 'idling' && distance <= 0) return mapRule[rules][2] // Loading
                if (curr_activity === 'moving' && distance > 0) return mapRule[rules][3] // Travel Loaded

            }

        }

    }

    return fixed

}

const _shapeActivity = (fixed: ActivityPoint[], shapes: any[], prev_activity: string = '', debug: boolean = false) => {

    if (fixed && fixed.length > 0) { }
    else return []

    const mapRule: Record<string, string[]> = {
        'Load': ['Queue to Load', 'Spot at Load', 'Loading', 'Travel Loaded'],
        'Dump': ['Queue to Dump', 'Spot at Dump', 'Dumping', 'Travel Empty'],
        'Park': ['Queue to Park', 'Spot at Park', 'Parked', 'Travel Empty'],
        'Fuel': ['Queue to Fuel', 'Spot at Fuel', 'Fueling', 'Travel Empty'],
        'Maintenance': ['Queue to Maintenance', 'Spot at Maintenance', 'Maintaining', 'Travel Empty'],
        'Alert on Entry': ['Approaching hazard', 'Entering hazard', 'In hazard', 'Traveling in hazard'],
        'Alert on Exit': ['Approaching hazard', 'Exiting hazard', 'Exited hazard', 'Traveling in hazard'],
    };

    // Helper sets for hazard transitions
    const hazardInsideSet = new Set<string>([
        mapRule['Alert on Entry'][2],   // In hazard
        mapRule['Alert on Entry'][3],   // Traveling in hazard
    ]);

    // Tunable thresholds (meters)
    const LINE_NEAR_M = 50;
    const POLY_NEAR_M = 100;

    // We'll maintain the previous high-level state across points to stabilize transitions
    let prev = prev_activity;

    for (const c of fixed) {

        if (!c?.mid) continue;

        // Preserve the original motion label (optional—remove if not needed)
        // @ts-ignore
        c.motion = c.activity; // 'moving' | 'idling'

        const B = c.mid;
        // IMPORTANT: GeoJSON/Turf uses [lon, lat]
        const point = turf.point([Number(B.lon), Number(B.lat)]);

        const candidates: Array<{
            priority: number; // 0 polygon, 1 line
            name: string;
            rules: string;
            connect: any;
            distance: number;
            geomType: string;
        }> = [];

        for (const x in shapes) {
            const { name, proj, rules, connect, obj } = shapes[x] || {};
            if (!obj?.geometry) continue;

            const { type } = obj.geometry;
            let distance = 0;

            if (type === 'LineString') {
                distance = turf.pointToLineDistance(point, obj, { units: 'meters' });
                if (distance <= LINE_NEAR_M) {
                    candidates.push({ priority: 1, name, rules, connect, distance, geomType: type });
                }
            } else {
                distance = turf.pointToPolygonDistance(point, obj, { units: 'meters' });
                if (distance <= POLY_NEAR_M) {
                    candidates.push({ priority: 0, name, rules, connect, distance, geomType: type });
                }
            }
        }

        candidates.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority; // polygons first
            if (a.distance !== b.distance) return a.distance - b.distance; // nearer first
            return 0;
        });

        // Defaults
        let newState = prev || c.activity;

        if (candidates.length > 0) {

            const top = candidates[0];
            const { name, rules, distance, geomType } = top;

            // Helpers
            const isPolygon = geomType !== 'LineString'
            const insidePoly = isPolygon && distance <= 0    // inside polygon
            const nearPoly = isPolygon && distance > 0       // near polygon (<= POLY_NEAR_M)
            const nearLine = !isPolygon                      // near line (<= LINE_NEAR_M)
            const isMoving = c.activity === 'moving'
            const isStopped = c.activity === 'idling'

            // ----------- LOAD -----------
            if (rules === 'Load') {
                if (isMoving && (prev === mapRule.Load[1] || prev === mapRule.Load[2])) {
                    newState = mapRule.Load[3]; // Travel Loaded
                } else if (insidePoly && isStopped && (prev === mapRule.Load[1] || prev === mapRule.Load[2])) {
                    newState = mapRule.Load[2]; // Loading (sticky)
                } else if (insidePoly && (isStopped || isMoving)) {
                    newState = mapRule.Load[1]; // Spot at Load (includes repositioning)
                } else if (nearPoly && isStopped) {
                    newState = mapRule.Load[0]; // Queue to Load
                } else if (nearLine && isStopped) {
                    newState = mapRule.Load[0]; // Queue to Load (line-based)
                } else if (isMoving) {
                    newState = mapRule.Load[3]; // Travel Loaded (fallback)
                } else {
                    newState = mapRule.Load[0];
                }
            }

            // ----------- DUMP -----------
            else if (rules === 'Dump') {
                if (isMoving && (prev === mapRule.Dump[1] || prev === mapRule.Dump[2])) {
                    newState = mapRule.Dump[3]; // Travel Empty
                } else if (insidePoly && isStopped && (prev === mapRule.Dump[1] || prev === mapRule.Dump[2])) {
                    newState = mapRule.Dump[2]; // Dumping (sticky)
                } else if (insidePoly && (isStopped || isMoving)) {
                    newState = mapRule.Dump[1]; // Spot at Dump
                } else if (nearPoly && isStopped) {
                    newState = mapRule.Dump[0]; // Queue to Dump
                } else if (nearLine && isStopped) {
                    newState = mapRule.Dump[0]; // Queue to Dump (line-based)
                } else if (isMoving) {
                    newState = mapRule.Dump[3]; // Travel Empty (fallback)
                } else {
                    newState = mapRule.Dump[0];
                }
            }

            // ----------- PARK -----------
            else if (rules === 'Park') {
                if (isMoving && (prev === mapRule.Park[1] || prev === mapRule.Park[2])) {
                    newState = mapRule.Park[3]; // Travel Empty (leaving park)
                } else if (insidePoly && isStopped && (prev === mapRule.Park[1] || prev === mapRule.Park[2])) {
                    newState = mapRule.Park[2]; // Parked (sticky)
                } else if (insidePoly && (isStopped || isMoving)) {
                    newState = mapRule.Park[1]; // Spot at Park
                } else if (nearPoly && isStopped) {
                    newState = mapRule.Park[0]; // Queue to Park
                } else if (nearLine && isStopped) {
                    newState = mapRule.Park[0]; // Queue to Park
                } else if (isMoving) {
                    newState = mapRule.Park[3]; // Travel Empty
                } else {
                    newState = mapRule.Park[0];
                }
            }

            // ----------- FUEL -----------
            else if (rules === 'Fuel') {
                if (isMoving && (prev === mapRule.Fuel[1] || prev === mapRule.Fuel[2])) {
                    newState = mapRule.Fuel[3]; // Travel Empty (leaving fuel bay)
                } else if (insidePoly && isStopped && (prev === mapRule.Fuel[1] || prev === mapRule.Fuel[2])) {
                    newState = mapRule.Fuel[2]; // Fueling (sticky)
                } else if (insidePoly && (isStopped || isMoving)) {
                    newState = mapRule.Fuel[1]; // Spot at Fuel
                } else if (nearPoly && isStopped) {
                    newState = mapRule.Fuel[0]; // Queue to Fuel
                } else if (nearLine && isStopped) {
                    newState = mapRule.Fuel[0]; // Queue to Fuel
                } else if (isMoving) {
                    newState = mapRule.Fuel[3]; // Travel Empty
                } else {
                    newState = mapRule.Fuel[0];
                }
            }

            // ------- MAINTENANCE -------
            else if (rules === 'Maintenance') {
                if (isMoving && (prev === mapRule.Maintenance[1] || prev === mapRule.Maintenance[2])) {
                    newState = mapRule.Maintenance[3]; // Travel Empty (leaving workshop)
                } else if (insidePoly && isStopped && (prev === mapRule.Maintenance[1] || prev === mapRule.Maintenance[2])) {
                    newState = mapRule.Maintenance[2]; // Maintaining (sticky)
                } else if (insidePoly && (isStopped || isMoving)) {
                    newState = mapRule.Maintenance[1]; // Spot at Maintenance
                } else if (nearPoly && isStopped) {
                    newState = mapRule.Maintenance[0]; // Queue to Maintenance
                } else if (nearLine && isStopped) {
                    newState = mapRule.Maintenance[0]; // Queue to Maintenance
                } else if (isMoving) {
                    newState = mapRule.Maintenance[3]; // Travel Empty
                } else {
                    newState = mapRule.Maintenance[0];
                }
            }

            // ----- ALERT ON ENTRY -----
            else if (rules === 'Alert on Entry') {
                if (insidePoly && isMoving) {
                    newState = hazardInsideSet.has(prev)
                        ? mapRule['Alert on Entry'][3] // Traveling in hazard
                        : mapRule['Alert on Entry'][1]; // Entering hazard
                } else if (insidePoly && isStopped) {
                    newState = hazardInsideSet.has(prev)
                        ? mapRule['Alert on Entry'][2] // In hazard
                        : mapRule['Alert on Entry'][1]; // Entering hazard
                } else if (nearPoly || nearLine) {
                    newState = mapRule['Alert on Entry'][0]; // Approaching hazard
                } else {
                    newState = mapRule['Alert on Entry'][0]; // default to approaching
                }
            }

            // ----- ALERT ON EXIT -----
            else if (rules === 'Alert on Exit') {
                if (insidePoly && (isMoving || isStopped)) {
                    newState = mapRule['Alert on Exit'][3]; // Traveling in hazard (still inside)
                } else if (nearPoly || nearLine) {
                    newState = hazardInsideSet.has(prev)
                        ? mapRule['Alert on Exit'][1] // Exiting hazard
                        : mapRule['Alert on Exit'][0]; // Approaching hazard
                } else {
                    // Outside and not near the hazard shape
                    newState = mapRule['Alert on Exit'][2]; // Exited hazard
                }
            }

            // else: keep prev/newState as-is for unknown rule types

            c.note = name

        }

        // Write into c.activity (as requested) and update prev for the next point
        c.activity = newState
        prev = newState

        if (candidates.length > 0) {

            debug && console.log(`[shapeActivity] new=${newState} name=${candidates[0].name} rules=${candidates[0].rules} distance=${ff(candidates[0].distance)}m`);

        }

    }

    // Return the modified array (NOT a state string)
    return fixed;
}

const ___shapeActivity = (fixed: ActivityPoint[], shapes: any[], prev_activity: string = '', debug: boolean = false): ActivityPoint[] => {

    if (!fixed?.length) return []

    const LINE_NEAR_M = 50
    const POLY_NEAR_M = 100
    const MIN_HOLD_MS = 10_000

    const mapRule: Record<string, string[]> = {
        'Load': ['Queue to Load', 'Spot at Load', 'Loading', 'Travel Loaded'],
        'Dump': ['Queue to Dump', 'Spot at Dump', 'Dumping', 'Travel Empty'],
        'Park': ['Queue to Park', 'Spot at Park', 'Parked', 'Travel Empty'],
        'Fuel': ['Queue to Fuel', 'Spot at Fuel', 'Fueling', 'Travel Empty'],
        'Maintenance': ['Queue to Maintenance', 'Spot at Maintenance', 'Maintaining', 'Travel Empty'],
        'Alert on Entry': ['Approaching hazard', 'Entering hazard', 'In hazard', 'Traveling in hazard'],
        'Alert on Exit': ['Approaching hazard', 'Exiting hazard', 'Exited hazard', 'Traveling in hazard'],
    }

    // Shared state machine for Load/Dump/Park/Fuel/Maintenance — all follow the same pattern
    const resolveZone = (r: string[], prev: string, insidePoly: boolean, nearPoly: boolean, nearLine: boolean, isMoving: boolean): string => {
        const wasSpot = prev === r[1]  // Spot at X
        const wasAction = prev === r[2]  // Loading / Dumping / Parked / Fueling / Maintaining
        const wasTravel = prev === r[3]  // Travel Loaded/Empty
        const wasDocked = wasSpot || wasAction

        if (insidePoly && !isMoving) {
            if (wasAction) return r[2]           // already in action (Parked/Loading/etc) → stay sticky
            if (wasSpot) return r[2]           // was spotting, now stopped → transition to action
            return r[1]                          // first arrival → Spot
        }
        if (insidePoly && isMoving) return r[1]                      // moving inside = repositioning, never Travel
        if (!insidePoly && isMoving && wasDocked) return r[3]         // left polygon while was docked → Travel
        if ((nearPoly || nearLine) && !isMoving) return r[0]         // near + stopped → Queue
        if (isMoving && (wasTravel || wasDocked)) return r[3]       // already travelling or just left → keep Travel
        return prev || r[0]
    }

    const resolveHazard = (r: string[], prev: string, insidePoly: boolean, nearAny: boolean, isMoving: boolean, isEntry: boolean): string => {
        const wasInside = prev === r[2] || prev === r[3]
        if (insidePoly && isMoving) return wasInside ? r[3] : r[1]   // Traveling / Entering
        if (insidePoly && !isMoving) return wasInside ? r[2] : r[1]   // In hazard / Entering
        if (!isEntry && !insidePoly && !nearAny) return r[2]           // Alert on Exit: Exited
        if (!isEntry && nearAny) return wasInside ? r[1] : r[0]       // Exiting / Approaching
        return r[0]                                                     // Approaching
    }

    let prev = prev_activity
    let prevStateAt: number | null = null

    for (const c of fixed) {

        if (!c?.mid) continue

        const point = turf.point([Number(c.mid.lon), Number(c.mid.lat)])

        // Find nearby shapes, sorted: polygons first, then by distance
        const candidates = Object.values(shapes)
            .filter(s => s?.obj?.geometry)
            .map(({ name, rules, connect, obj }) => {
                const isLine = obj.geometry.type === 'LineString'
                const dist = isLine
                    ? turf.pointToLineDistance(point, obj, { units: 'meters' })
                    : turf.pointToPolygonDistance(point, obj, { units: 'meters' })
                return { name, rules, connect, dist, isLine }
            })
            .filter(({ dist, isLine }) => dist <= (isLine ? LINE_NEAR_M : POLY_NEAR_M))
            .sort((a, b) => (a.isLine !== b.isLine ? (a.isLine ? 1 : -1) : a.dist - b.dist))

        let newState = prev || c.activity

        if (candidates.length > 0) {
            const { name, rules, dist, isLine } = candidates[0]
            const insidePoly = !isLine && dist <= 0
            const nearPoly = !isLine && dist > 0
            const nearLine = isLine
            const isMoving = c.activity === 'moving'
            const r = mapRule[rules]

            if (r) {
                if (['Load', 'Dump', 'Park', 'Fuel', 'Maintenance'].includes(rules)) {
                    newState = resolveZone(r, prev, insidePoly, nearPoly, nearLine, isMoving)
                } else if (rules === 'Alert on Entry') {
                    newState = resolveHazard(r, prev, insidePoly, nearPoly || nearLine, isMoving, true)
                } else if (rules === 'Alert on Exit') {
                    newState = resolveHazard(r, prev, insidePoly, nearPoly || nearLine, isMoving, false)
                }
            }

            c.note = name
        }

        // Anti-flicker: only commit transition if prev state held long enough
        if (newState !== prev) {
            const heldMs = prevStateAt ? new Date(c.mid.updated).getTime() - prevStateAt : Infinity
            if (heldMs >= MIN_HOLD_MS) {
                prev = newState
                prevStateAt = new Date(c.mid.updated).getTime()
            }
            // else: ignore flip, stay in current stable state
        } else if (!prevStateAt) {
            prevStateAt = new Date(c.mid.updated).getTime()
        }

        c.activity = prev

        debug && candidates.length > 0 && console.log(`[shapeActivity] state=${prev} shape=${candidates[0].name} rule=${candidates[0].rules} dist=${ff(candidates[0].dist)}m`)

    }

    return fixed
}

const shapeActivity = (fixed: ActivityPoint[], shapes: any[], prev_activity: string = '', debug: boolean = false): ActivityPoint[] => {

    if (!fixed?.length) return []

    const LINE_NEAR_M = 50
    const POLY_NEAR_M = 100
    const MIN_HOLD_MS = 10_000

    const mapRule: Record<string, string[]> = {
        'Load': ['Queue to Load', 'Spot at Load', 'Loading', 'Travel Loaded'],
        'Dump': ['Queue to Dump', 'Spot at Dump', 'Dumping', 'Travel Empty'],
        'Park': ['Queue to Park', 'Spot at Park', 'Parked', 'Travel Empty'],
        'Fuel': ['Queue to Fuel', 'Spot at Fuel', 'Fueling', 'Travel Empty'],
        'Maintenance': ['Queue to Maintenance', 'Spot at Maintenance', 'Maintaining', 'Travel Empty'],
        'Alert on Entry': ['Approaching hazard', 'Entering hazard', 'In hazard', 'Traveling in hazard'],
        'Alert on Exit': ['Approaching hazard', 'Exiting hazard', 'Exited hazard', 'Traveling in hazard'],
    }

    const resolveZone = (
        r: string[], prev: string,
        insidePoly: boolean, nearPoly: boolean, nearLine: boolean,
        isMoving: boolean,
        didStop: boolean  // did vehicle ever stop inside this polygon?
    ): string => {
        const wasSpot = prev === r[1]
        const wasAction = prev === r[2]
        const wasTravel = prev === r[3]
        const wasDocked = wasSpot || wasAction

        if (insidePoly && !isMoving) {
            if (wasAction) return r[2]          // sticky: Parked/Loading/Fueling/etc
            if (wasSpot) return r[2]          // was spotting → transition to action
            return r[1]                         // fresh arrival → Spot
        }
        if (insidePoly && isMoving) {
            if (!didStop) return prev || r[3]   // pass-through: never stopped → keep Travel
            return r[1]                         // stopped before → repositioning = Spot
        }
        if (!insidePoly && isMoving && wasDocked) return r[3]         // left after docking → Travel
        if ((nearPoly || nearLine) && !isMoving) return r[0]          // near + stopped → Queue
        if (isMoving && (wasTravel || wasDocked)) return r[3]         // keep travelling
        return prev || r[0]
    }

    const resolveHazard = (
        r: string[], prev: string,
        insidePoly: boolean, nearAny: boolean,
        isMoving: boolean, isEntry: boolean
    ): string => {
        const wasInside = prev === r[2] || prev === r[3]
        if (insidePoly && isMoving) return wasInside ? r[3] : r[1]  // Traveling / Entering
        if (insidePoly && !isMoving) return wasInside ? r[2] : r[1]  // In hazard / Entering
        if (!isEntry && !insidePoly && !nearAny) return r[2]          // Alert on Exit: Exited
        if (!isEntry && nearAny) return wasInside ? r[1] : r[0]      // Exiting / Approaching
        return r[0]                                                    // Approaching
    }

    let prev = prev_activity
    let prevStateAt: number | null = null
    let stoppedInsideShape: string | null = null  // tracks shape where vehicle last stopped

    for (const c of fixed) {

        if (!c?.mid) continue

        const point = turf.point([Number(c.mid.lon), Number(c.mid.lat)])

        // Find nearby shapes, sorted: polygons first, then by distance
        const candidates = Object.values(shapes)
            .filter((s: any) => s?.obj?.geometry)
            .map(({ name, rules, connect, obj }: any) => {
                const isLine = obj.geometry.type === 'LineString'
                const dist = isLine
                    ? turf.pointToLineDistance(point, obj, { units: 'meters' })
                    : turf.pointToPolygonDistance(point, obj, { units: 'meters' })
                return { name, rules, connect, dist, isLine }
            })
            .filter(({ dist, isLine }: any) => dist <= (isLine ? LINE_NEAR_M : POLY_NEAR_M))
            .sort((a: any, b: any) => a.isLine !== b.isLine ? (a.isLine ? 1 : -1) : a.dist - b.dist)

        let newState = prev || c.activity

        if (candidates.length > 0) {

            const { name, rules, dist, isLine } = candidates[0]
            const insidePoly = !isLine && dist <= 0
            const nearPoly = !isLine && dist > 0
            const nearLine = isLine
            const isMoving = c.activity === 'moving'
            const r = mapRule[rules]

            // Update stopped-inside tracker
            if (insidePoly && !isMoving) stoppedInsideShape = name
            if (!insidePoly) stoppedInsideShape = null

            if (r) {
                if (['Load', 'Dump', 'Park', 'Fuel', 'Maintenance'].includes(rules)) {
                    newState = resolveZone(r, prev, insidePoly, nearPoly, nearLine, isMoving, stoppedInsideShape === name)
                } else if (rules === 'Alert on Entry') {
                    newState = resolveHazard(r, prev, insidePoly, nearPoly || nearLine, isMoving, true)
                } else if (rules === 'Alert on Exit') {
                    newState = resolveHazard(r, prev, insidePoly, nearPoly || nearLine, isMoving, false)
                }
            }

            c.note = name
        }

        // Anti-flicker: only commit transition if prev state held long enough
        if (newState !== prev) {
            const heldMs = prevStateAt ? new Date(c.mid.updated).getTime() - prevStateAt : Infinity
            if (heldMs >= MIN_HOLD_MS) {
                prev = newState
                prevStateAt = new Date(c.mid.updated).getTime()
            }
        } else if (!prevStateAt) {
            prevStateAt = new Date(c.mid.updated).getTime()
        }

        c.activity = prev

        debug && candidates.length > 0 && console.log(
            `[shapeActivity] state=${prev} shape=${candidates[0].name} rule=${candidates[0].rules} dist=${ff(candidates[0].dist)}m didStop=${stoppedInsideShape === candidates[0].name}`
        )
    }

    return fixed
}

// Detect & fix GPS jumps
const normalize = (points: VehiclePoint[], vtype: string, debug: boolean = false): ActivityPoint[] => {

    if (points.length < 3) return []

    const fixed: VehiclePoint[] = [...points]

    const List: ActivityPoint[] = []
    let threshold = 0.5
    if (vtype === 'drill') threshold = 0.2

    for (let i = 0; i < points.length - 2; i++) {

        const A = fixed[i + 0]
        const B = fixed[i + 1]
        const C = fixed[i + 2]

        const A2B = distance(A, B)
        const B2C = distance(B, C)
        const A2C = Number((A2B + B2C).toFixed(2))

        const Duration = Math.round((C.updated.getTime() - A.updated.getTime()) / 1000)

        const AB = makeVector(A, B)
        const BC = makeVector(B, C)
        const Angle = Number(signedAngleBetween(AB, BC).toFixed(1))

        const degA = headingDegrees(A, B)
        const degB = headingDegrees(B, C)
        const degAtxt = angleToCompass8Short(degA)
        const degBtxt = angleToCompass8Short(degB)
        const arrA = arrowForAngle(degA)
        const arrB = arrowForAngle(degB)

        const Sample: ActivityPoint = {
            activity: '',
            details: `${degA},${degAtxt},${arrA},${degB},${degBtxt},${arrB}`,
            // note: B.work ?? '-|-|-',
            note: '-',
            startedAt: moment(A.updated).format(dateFormat),
            start: `${A.east},${A.north},${A.elevation}`,
            endedAt: moment(A.updated).format(dateFormat),
            end: `${C.east},${C.north},${C.elevation}`,
            distance: A2C,
            duration: Duration,
            angle: Angle,
            mid: B,
        }

        /** Offline activity **/
        if (Duration > 30) {

            List.push({ ...Sample, activity: 'offline' })
            continue

        }

        /** Moving activity **/
        if (A2C >= threshold) {

            List.push({ ...Sample, activity: 'moving' })
            continue

        }

        /** Idling activity **/
        if (A2C < threshold) {

            List.push({ ...Sample, activity: 'idling' })
            continue

        }

    }

    return List

}

const gsvg = (key: string, fixed: ActivityPoint[] = [], debug = false) => {

    try {

        if (debug === false) return null

        let svg = '', east = 0, north = 0, em = Infinity, nm = Infinity, emx = 0, nmx = 0, pre = ''
        let size = 500, zoom = 10, gap = 10

        for (let i = 0; i < fixed.length; i++) {

            const { start, end } = fixed[i]
            const [e0, n0, l0] = start.split(',').map(e => Number(e))
            const [e1, n1, l1] = end.split(',').map(e => Number(e))

            east += (e0) + (e1)
            north += (n0) + (n1)

            em = Math.min(em, (e0), (e1))
            nm = Math.min(nm, (n0), (n1))
            emx = Math.max(emx, (e0), (e1))
            nmx = Math.max(nmx, (n0), (n1))

        }

        east = east / fixed.length
        north = north / fixed.length

        let ew = emx - em
        let nw = nmx - nm
        zoom = size / Math.max(nw, ew)

        const color_map: any = { 'Idling': 'grey', 'Moving': 'aqua', 'Jumped': 'red', 'Offline': 'black', 'Unknown': 'black' }

        for (let i = 0; i < fixed.length; i++) {

            const { startedAt, endedAt, start, end, distance, duration, angle, activity, note, details } = fixed[i]
            const [e0, n0, l0] = start.split(',').map(e => Number(e))
            const [e1, n1, l1] = end.split(',').map(e => Number(e))

            const x0 = (e0 - em) * zoom, y0 = (n0 - nm) * zoom
            const x1 = (e1 - em) * zoom, y1 = (n1 - nm) * zoom

            svg += `
            <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" style="stroke:${i % 2 ? '#000' : color_map[activity]};stroke-width:1" />

            <g stroke="blue" stroke-width="1" fill="aqua">
                <circle id="point-${i}" cx="${x0}" cy="${y0}" r="4" />
                <circle id="point-${i}" cx="${x1}" cy="${y1}" r="4" />
            </g>

            <g font-size="10" font-family="sans-serif" fill="aqua" text-anchor="middle">
                <text fill="#fff" x="${(x0 + x1) / 2}" y="${(y0 + y1) / 2}">${i}</text>
            </g>`

            // fixed[i].help.length > 0 && console.log(fixed[i].help)

            pre += `<span style="display: inline-block;min-width: 80px;">${f(i)} - ${fixed[i].activity}: </span>`
            pre += `<span>${endedAt} ${angle}° ${duration}s ${distance}m ${note} / ${details}</span>\n`

        }

        return [`<body style="background: currentColor">
        <pre style="color: #fff; border: 1px solid green; width: ${size - 10}px; padding: 5px; font-size: 10px;">${key} [ ${ff(size / zoom, 1)}m² ]</pre>
        <svg height="${size}" width="${size}" xmlns="http://www.w3.org/2000/svg" style="border: 1px solid red">
            <g transform="translate(0,${size})">
            <g transform="scale(1,-1)">
            ${svg}
        </svg>
        <pre style="color: #fff; width: ${size - 10}px; padding: 5px; font-size: 10px;">${pre}</pre>
    </body>`, size / zoom]

    } catch (err: any) {
        log.warn(`[csv] ${err.message}`)
        return []
    }

}

export const calculate_activities = (key = '', buff_acts: any = [], buff_samps: string[], shapes: any[] = [], vehicle_name: any = null) => {

    try {

        const [proj, type, name] = key.split('.')
        const debug = name === vehicle_name
        const prev_activity = buff_acts && buff_acts.length > 0 ? buff_acts[buff_acts.length - 1].activity : ''
        const count_buff_activity = buff_acts ? buff_acts.length : 0

        const parsed: VehiclePoint[] = parser(buff_samps)
        const normal = normalize(parsed, type, debug)
        const fixed = shapeActivity(normal, shapes, prev_activity, debug)

        let activities: any = [], sliced_acts: any = [], sliced_samps: any = []

        for (let i = 0; i < fixed.length; i++) {

            const put = (j: number, w = '') => {

                if (w === 'start') {

                    buff_acts[buff_acts.length - 1].startedAt = fixed[j].startedAt
                    buff_acts[buff_acts.length - 1].start = fixed[j].start

                    buff_acts[buff_acts.length - 1].note = fixed[j].note
                    buff_acts[buff_acts.length - 1].details = fixed[j].details
                    buff_acts[buff_acts.length - 1].distance = 0
                    buff_acts[buff_acts.length - 1].duration = 0

                } else {

                    buff_acts[buff_acts.length - 1].endedAt = fixed[j].endedAt
                    buff_acts[buff_acts.length - 1].end = fixed[j].end

                    buff_acts[buff_acts.length - 1].note = fixed[j].note
                    buff_acts[buff_acts.length - 1].details = fixed[j].details
                    // buff_acts[buff_acts.length - 1].distance += fixed[j].distance
                    buff_acts[buff_acts.length - 1].distance = Number((buff_acts[buff_acts.length - 1].distance + fixed[j].distance).toFixed(2))
                    buff_acts[buff_acts.length - 1].duration += fixed[j].duration

                }

            }

            if (buff_acts.length > 0 && buff_acts[buff_acts.length - 1].activity === fixed[i].activity) put(i, 'end')
            else {

                if (buff_acts.length > 0) put(i, 'end')

                buff_acts.push({ proj, type, name, activity: fixed[i].activity, details: '-', note: fixed[i].note })

                put(i, 'start')
                put(i, 'end')

                if (fixed[i + 1]) put(i + 1, 'end')

            }

        }

        if (debug && count_buff_activity) {

            console.log('')
            for (const x of buff_acts) {
                const { name, activity, note, duration, distance } = x
                console.log(` ${name} -> ${note} / ${activity} -> ${duration}s -> ${distance}m `)
            }

            console.log(` ${count_buff_activity} -> ${buff_acts.length} `)
        }

        activities = [...buff_acts]
        sliced_acts = buff_acts.slice(-2) /** Keeping 2 items atleast **/
        sliced_samps = buff_samps.slice(-2) /** Keeping 2 items atleast **/

        return [
            activities,   // Activities
            sliced_acts,  // Sliced.Buff-activities
            sliced_samps, // Sliced.Buff_samples
            gsvg(key, fixed, debug),  // SVG to visualize the calculation process
        ]

    } catch (err) { console.log(err) }

}