import * as turf from '@turf/turf'
import { log } from 'utils'

export type Vec2 = { x: number; y: number }

export type VehiclePoint = {
    east: number
    north: number
    lat: number
    lon: number
    elevation: number
    heading: number
    speed: number
    work: [string, number] | null
    time: Date
}

export type ActivityPoint = {
    proj?: string, type?: string, name?: string,
    state: string, trigger: string, visit: string,
    distance: number, duration: number,
    startedAt: string, start: string,
    endedAt: string, end: string,
    _: VehiclePoint,
}

// Format float
export const ff = (value: number, precision: number = 2): number => Number(value.toFixed(precision))
export const f = (n: number) => n > 99 ? `${n}` : n > 9 ? `0${n}` : `00${n}`

// Euclidean distance in 2D
export const distance = (a: VehiclePoint, b: VehiclePoint): number => Math.hypot(a.east - b.east, a.north - b.north)

export const makeVector = (a: VehiclePoint, b: VehiclePoint): Vec2 => ({ x: b.east - a.east, y: b.north - a.north })

export const signedAngleBetween = (v1: Vec2, v2: Vec2): number => {
    const dot = v1.x * v2.x + v1.y * v2.y
    const cross = v1.x * v2.y - v1.y * v2.x
    return Math.atan2(cross, dot) * (180 / Math.PI) // degrees, -180..+180
}

export const headingDegrees = (A: VehiclePoint, B: VehiclePoint): number => {
    const dE = B.east - A.east
    const dN = B.north - A.north
    if (dE === 0 && dN === 0) return NaN
    const angle = Math.atan2(dE, dN) * (180 / Math.PI)
    return Math.round(angle < 0 ? angle + 360 : angle)
}

const main_rules = ['Load', 'Dump', 'Park', 'Fuel', 'Maintenance', 'Alert on Entry', 'Alert on Exit']

const line_rules = {
    'On the path': { lt: 20 },
    'Joining the path': { not: ['On the path'], gte: 20, lt: 50 },
    'Leaving the path': { in: ['On the path'], gte: 20, lt: 50 },
}

const loading_rules = {
    'Queue to Load': { gte: 0, lt: 50, state: 'idling' },
    'Spot at Load': { not: ['Loading'], lt: 0, state: 'moving' },
    'Loading': { lt: 0, state: 'idling' },
    'Travel Loaded': { in: ['Spot At Load', 'Loading'], gte: 0, lt: 100 },
}

const dumping_rules = {
    'Queue to Dump': { gte: 0, lt: 50, state: 'idling' },
    'Spot at Dump': { not: ['Dumping'], lt: 0, state: 'moving' },
    'Dumping': { lt: 0, state: 'idling' },
    'Travel Empty': { in: ['Spot At Dump', 'Dumping'], gte: 0, lt: 100 },
}

const parking_rules = {
    'Queue to Park': { gte: 0, lt: 50, state: 'idling' },
    'Spot at Park': { not: ['Parked'], lt: 0, state: 'moving' },
    'Parked': { lt: 0, state: 'idling' },
    'Travel Empty': { in: ['Spot At Park', 'Parked'], gte: 0, lt: 100 },
}

const fuel_rules = {
    'Queue to Fuel': { gte: 0, lt: 50, state: 'idling' },
    'Spot at Fuel': { not: ['Fueling'], lt: 0, state: 'moving' },
    'Fueling': { lt: 0, state: 'idling' },
    'Travel Empty': { in: ['Spot At Fuel', 'Fueling'], gte: 0, lt: 100 },
}

const maintenance_rules = {
    'Queue to Maintenance': { gte: 0, lt: 50, state: 'idling' },
    'Spot at Maintenance': { not: ['Maintaining'], lt: 0, state: 'moving' },
    'Maintaining': { lt: 0, state: 'idling' },
    'Travel Empty': { in: ['Spot At Maintenance', 'Maintaining'], gte: 0, lt: 100 },
}

const common_rules = {
    'Queue to *': { gte: 0, lt: 50, state: 'idling' },
    'Spot at *': { not: ['*(ing)'], lt: 0, state: 'moving' },
    '*(ing)': { lt: 0, state: 'idling' },
    'Travel Empty': { in: ['Spot At *', '*(ing)'], gte: 0, lt: 100 },
}

const alert_on_entry_rules = {
    'Alert Entering': { not: ['Alert Entering'], lt: 0 },
}

const alert_on_exit_rules = {
    'Alert Exiting': { not: ['Alert Exiting'], gte: 0, lt: 100 },
}

export const findMatchingShape = (_point: ActivityPoint, _prev: any, shapes: any[]) => {

    try {

        const B = _point._
        const point = turf.point([Number(B.lon), Number(B.lat)])
        const sample = { ..._point, trigger: `*` }
        let min_prio = Infinity
        let shape = null

        for (const x in shapes) {

            const { name, proj, rules, connect, obj, style } = shapes[x] || {}
            const { color, thick } = JSON.parse(style)
            if (!obj?.geometry) continue
            const priority = main_rules.findIndex((k) => rules === k)
            if (priority < 0) continue
            const { type } = obj.geometry
            const is_line = type === 'LineString'
            const distance = turf[is_line ? 'pointToLineDistance' : 'pointToPolygonDistance'](point, obj, { units: 'meters' })
            let rule_ref: any = null

            if (rules === 'Alert on Entry') rule_ref = alert_on_entry_rules
            if (rules === 'Alert on Exit') rule_ref = alert_on_exit_rules
            if (type === 'LineString') rule_ref = line_rules
            // if (type === 'Polygon') rule_ref = common_rules
            if (rules === 'Park') rule_ref = parking_rules
            if (rules === 'Fuel') rule_ref = fuel_rules
            if (rules === 'Maintenance') rule_ref = maintenance_rules
            if (rules === 'Load') rule_ref = loading_rules
            if (rules === 'Dump') rule_ref = dumping_rules

            if (rule_ref) {

                for (const k in rule_ref) {

                    const r = rule_ref[k]
                    const m: any = {}

                    if (r.hasOwnProperty('state')) m.state = r.state === sample.state
                    if (r.hasOwnProperty('gte')) m.gte = distance >= r.gte
                    if (r.hasOwnProperty('lt')) m.lt = distance < r.lt
                    if (r.hasOwnProperty('in')) m.in = _prev && _prev.trigger && r.in.includes(_prev.trigger)
                    if (r.hasOwnProperty('not')) m.not = _prev && _prev.trigger && !r.not.includes(_prev.trigger)

                    const valid = Object.values(m).every((v) => v === true)
                    if (valid && priority < min_prio) min_prio = priority, shape = { name, proj, rules, connect, color, thick, trigger: k }

                }

            }

        }

        if (shape) {
            sample.trigger = shape.trigger
            sample.visit = shape.name
        }

        return sample

    } catch (e: any) {

        log.error(`Error processing FindMatchingShape: ${e.message}`)
        return null

    }

}