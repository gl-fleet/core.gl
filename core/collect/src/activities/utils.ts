import { dateFormat, moment } from 'utils'

type Vec2 = { x: number; y: number }

type VehiclePoint = {
    east: number
    north: number
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
    activity: string, details: string, note: string,
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


const unicodeArrows: Record<Compass8OrUndef, string> = {
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

    const [east, north, elevation, heading, speed, updated, work = '-|-|-'] = entry.split(',')

    return {
        east: parseFloat(east),
        north: parseFloat(north),
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

// Detect & fix GPS jumps
const normalize = (points: VehiclePoint[], vtype: string): ActivityPoint[] => {

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
            note: B.work ?? '-|-|-',
            startedAt: moment(A.updated).format(dateFormat),
            start: `${A.east},${A.north},${A.elevation}`,
            endedAt: moment(A.updated).format(dateFormat),
            end: `${C.east},${C.north},${C.elevation}`,
            distance: A2C,
            duration: Duration,
            angle: Angle,
        }

        /** Offline activity **/
        if (Duration > 30) {

            List.push({ ...Sample, activity: 'Offline' })
            continue

        }

        /** Moving activity **/
        if (A2C >= threshold) {

            List.push({ ...Sample, activity: 'Moving' })
            continue

        }

        /** Idling activity **/
        if (A2C < threshold) {

            List.push({ ...Sample, activity: 'Idling' })
            continue

        }

    }

    return List

}

const gsvg = (key: string, fixed: ActivityPoint[] = []) => {

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

        const { start, end, distance, duration, angle, activity, note, details } = fixed[i]
        const [e0, n0, l0] = start.split(',').map(e => Number(e))
        const [e1, n1, l1] = end.split(',').map(e => Number(e))

        const x0 = (e0 - em) * zoom, y0 = (n0 - nm) * zoom
        const x1 = (e1 - em) * zoom, y1 = (n1 - nm) * zoom

        svg += `
            <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" style="stroke:${color_map[activity]};stroke-width:1" />

            <g stroke="blue" stroke-width="1" fill="aqua">
                <circle id="point-${i}" cx="${x0}" cy="${y0}" r="4" />
                <circle id="point-${i}" cx="${x1}" cy="${y1}" r="4" />
            </g>

            <g font-size="10" font-family="sans-serif" fill="aqua" text-anchor="middle">
                <text fill="#fff" x="${(x0 + x1) / 2}" y="${(y0 + y1) / 2}">${i}</text>
            </g>`

        pre += `<span style="display: inline-block;min-width: 80px;">${f(i)} - ${fixed[i].activity}: </span>`
        pre += `<span>${angle}° ${duration}s ${distance}m ${note} / ${details}</span>\n`

    }

    return [`<body style="background: currentColor">
        <pre style="color: #fff; border: 1px solid green; width: ${size - 10}px; padding: 5px; font-size: 10px;">${key} [ ${ff(size / zoom, 1)}m² ]</pre>
        <svg height="${size}" width="${size}" xmlns="http://www.w3.org/2000/svg" style="border: 1px solid red">
            <g transform="translate(0,${size})">
            <g transform="scale(1,-1)">
            ${svg}
        </svg>
        <pre style="color: #fff; border: 1px solid green; width: ${size - 10}px; padding: 5px; font-size: 10px;">${pre}</pre>
    </body>`, size / zoom]

}

export const calculate_activities = (key = '', buff_acts: any = [], buff_samps: string[], vehicle_name = 'to-debug') => {

    const [proj, type, name] = key.split('.')
    const debug = name === vehicle_name

    const parsed: VehiclePoint[] = parser(buff_samps)
    const fixed = normalize(parsed, type)
    let activities: any = [], sliced_acts: any = [], sliced_samps: any = []

    /* debug && console.log('\n========== [Buff samples] =========\n')
    for (let i = 0; i < buff_samps.length; i++) debug && console.log(`buff_samps[${f(i)}] --- `, buff_samps[i])

    debug && console.log('\n========== [Buff activities (enum)] =========\n')
    for (let i = 0; i < buff_acts.length; i++) debug && console.log(`buff_acts[${f(i)}] ${buff_acts[i].startedAt} - ${buff_acts[i].endedAt} --- ${buff_acts[i].activity} ${buff_acts[i].duration}s ${buff_acts[i].distance}m`)

    debug && console.log('\n========== [Normalized fixed[*]] =========\n')
    for (let i = 0; i < fixed.length; i++) debug && console.log(`fixed[${f(i)}] ${moment(fixed[i].updated).format(dateFormat)} --- ${fixed[i].activity} ${fixed[i].seconds}s ${fixed[i].meters}m`) */

    for (let i = 0; i < fixed.length; i++) {

        const put = (j: number, w = '') => {

            if (w === 'start') {

                buff_acts[buff_acts.length - 1].startedAt = fixed[j].startedAt // moment(fixed[j].updated).format(dateFormat)
                buff_acts[buff_acts.length - 1].start = fixed[j].start // `${fixed[j].east},${fixed[j].north},${fixed[j].elevation},${fixed[j].heading},${fixed[j].speed}`

                buff_acts[buff_acts.length - 1].note = fixed[j].note
                buff_acts[buff_acts.length - 1].details = fixed[j].details
                buff_acts[buff_acts.length - 1].distance = 0
                buff_acts[buff_acts.length - 1].duration = 0

            } else {

                buff_acts[buff_acts.length - 1].endedAt = fixed[j].endedAt // moment(fixed[j].updated).format(dateFormat)
                buff_acts[buff_acts.length - 1].end = fixed[j].end // `${fixed[j].east},${fixed[j].north},${fixed[j].elevation},${fixed[j].heading},${fixed[j].speed}`

                buff_acts[buff_acts.length - 1].note = fixed[j].note
                buff_acts[buff_acts.length - 1].details = fixed[j].details
                buff_acts[buff_acts.length - 1].distance += fixed[j].distance
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

    sliced_acts = buff_acts.slice(-2) /** Keeping 2 items atleast **/
    sliced_samps = buff_samps.slice(-2) /** Keeping 2 items atleast **/

    debug && console.log('\n========== [ *** *** *** ] =========\n')
    debug && console.log(`Activities: ${activities.length} / Buff_Acts: ${sliced_acts.length} / Buff_Samps: ${sliced_samps.length} \n`)

    return [
        activities,   // Activities
        sliced_acts,  // Sliced.Buff-activities
        sliced_samps, // Sliced.Buff_samples
        gsvg(key, fixed),  // SVG to visualize the calculation process
    ]

}