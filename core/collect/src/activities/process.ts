import * as turf from '@turf/turf'
import { dateFormat, moment, log } from 'utils'
import type { VehiclePoint, ActivityPoint } from './utils'
import { findMatchingShape, distance, signedAngleBetween, headingDegrees, ff } from './utils'

/** Will parse the raw data for processing */
const parser = (samps: string[]): VehiclePoint[] => {

    const samples = samps.map((entry, idx) => {

        const [east, north, lat, lon, elevation, heading, speed, created, work = '-|-|-'] = entry.split(',')

        const [display, name, actual] = work.split('|')

        let on_screen: [string, number] | null = null

        if (display === '2') { /** Open Dig_Plan usually for Supervisors / Bulldozers */
            // 2,FILL ↑,-0.53
            // 2,CUT ↓,11.29
            // 2,FILL ↑,-3.58
            // console.log(`Display: ${display}, DigPlanName: ${name}, Cut&Fill: ${actual}`)
            on_screen = [name, Number(actual)]
        }

        if (display === '3') { /** Open Shot_Design usually for drill */
            // 3,S11,0.16
            // 3,F7,0.63
            // 3,I21,0.11
            // console.log(`Display: ${display}, ShotName: ${name}, DistanceToShot: ${actual}`)
            on_screen = [name, Number(actual)]
        }

        return {
            east: parseFloat(east),
            north: parseFloat(north),
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            elevation: parseFloat(elevation),
            heading: parseFloat(heading),
            speed: parseFloat(speed),
            work: on_screen,
            time: new Date(created),
        }

    })

    return samples

}

/** Will generate GPS activity */
const gps_activity = (points: VehiclePoint[], vtype: string, debug: boolean = false): ActivityPoint[] => {

    if (points.length < 3) return []

    const list: ActivityPoint[] = []

    let MOVE_THRESH = 2.5 /** Threshold for determining if a vehicle is moving [ meters ] */
    let ERR_THRESH = 100 /** Error threshold for GPS glitches [ meters ] */
    let OFFLINE_THRESH = 30 /** Threshold for determining if a vehicle is offline [ seconds ] */

    if (vtype === 'drill') MOVE_THRESH = 0.2
    if (vtype === 'vehicle') MOVE_THRESH = 0.5

    for (let i = 0; i < points.length - 2; i++) {

        const A = points[i + 0]
        const B = points[i + 1]
        const C = points[i + 2]

        const disAB = distance(A, B)
        const disBC = distance(B, C)
        const disAC = Number((disAB + disBC).toFixed(2))

        const durAB = Math.round((B.time.getTime() - A.time.getTime()) / 1000)
        const durBC = Math.round((C.time.getTime() - B.time.getTime()) / 1000)
        const durAC = durAB + durBC

        const sample: ActivityPoint = {
            state: '',
            trigger: '',
            visit: '',
            // visit: `${points[i].work?.[0] || '-'}:${points[i].work?.[1] || 0}`,
            distance: disAC,
            duration: durAC,
            startedAt: moment(A.time).format(dateFormat),
            start: `${A.east},${A.north},${A.elevation}`,
            endedAt: moment(C.time).format(dateFormat),
            end: `${C.east},${C.north},${C.elevation}`,
            _: B
        }

        /** Offline activity **/
        if (durAC >= OFFLINE_THRESH) {

            list.push({ ...sample, state: 'offline' })
            continue

        } else {

            /** GPS glitch, treat as error **/
            if (disAC >= ERR_THRESH) {

                list.push({ ...sample, state: 'error' })
                continue

            }

            /** Moving activity **/
            if (disAB >= MOVE_THRESH && disBC >= MOVE_THRESH) {

                list.push({ ...sample, state: 'moving' })
                continue

            } else {

                /** Idling activity **/
                list.push({ ...sample, state: 'idling' })
                continue

            }

        }

    }

    return list

}

/** Will generate map activity using boundaries */
const map_activity = (points: ActivityPoint[], shapes: any[], prev_activity: any = {}, debug: boolean = false) => {

    const list: ActivityPoint[] = []
    let prev = prev_activity

    for (const c of points) {

        const sample = findMatchingShape(c, prev, shapes)

        if (sample) {

            list.push({ ...sample })
            prev = sample

        }

    }

    return list

}

/** Fix floating point precision issues or Add custom logic that fills tonnage [...] */
const custom_operations = (points: ActivityPoint[]) => {

    return points
    // return points.map((p) => ({ ...p, distance: ff(p.distance, 2) }))

}

export const process_activities = (

    key = '',
    buff_acts: any = [],
    buff_samps: string[],
    shapes: any[] = [],
    vehicle_name: any = null

) => {

    try {

        const [proj, type, name] = key.split('.')
        const debug = name === vehicle_name
        const count_buff_activity = buff_acts ? buff_acts.length : 0
        const prev_activity = buff_acts && buff_acts.length > 0 ? buff_acts[buff_acts.length - 1] : ''

        const parsed = parser(buff_samps)
        const gps_acts = gps_activity(parsed, type, debug)
        const map_acts = map_activity(gps_acts, shapes, prev_activity, debug)
        const cus_acts = custom_operations(map_acts)

        let activities: any = [], sliced_acts: any = [], sliced_samps: any = []

        for (let i = 0; i < cus_acts.length; i++) {

            const put = (j: number, w = '') => {

                if (w === 'start') {

                    buff_acts[buff_acts.length - 1].startedAt = cus_acts[j].startedAt
                    buff_acts[buff_acts.length - 1].start = cus_acts[j].start

                    buff_acts[buff_acts.length - 1].state = cus_acts[j].state
                    buff_acts[buff_acts.length - 1].trigger = cus_acts[j].trigger
                    buff_acts[buff_acts.length - 1].visit = cus_acts[j].visit
                    buff_acts[buff_acts.length - 1].distance = 0
                    buff_acts[buff_acts.length - 1].duration = 0

                } else {

                    buff_acts[buff_acts.length - 1].endedAt = cus_acts[j].endedAt
                    buff_acts[buff_acts.length - 1].end = cus_acts[j].end

                    buff_acts[buff_acts.length - 1].state = cus_acts[j].state
                    buff_acts[buff_acts.length - 1].trigger = cus_acts[j].trigger
                    buff_acts[buff_acts.length - 1].visit = cus_acts[j].visit
                    buff_acts[buff_acts.length - 1].distance += cus_acts[j].distance
                    buff_acts[buff_acts.length - 1].duration += cus_acts[j].duration

                }

            }

            if (buff_acts.length > 0 && buff_acts[buff_acts.length - 1].trigger === cus_acts[i].trigger) put(i, 'end')
            else {

                if (buff_acts.length > 0) put(i, 'end')

                buff_acts.push({
                    proj, type, name,
                    state: cus_acts[i].state,
                    trigger: cus_acts[i].trigger,
                    visit: cus_acts[i].visit
                })

                put(i, 'start')
                put(i, 'end')

                if (cus_acts[i + 1]) put(i + 1, 'end')

            }

        }

        for (const x of buff_acts) {
            x.distance = ff(x.distance, 2)
        }

        if (debug && count_buff_activity) {

            console.log('')
            for (const x of buff_acts) {
                const { name, state, trigger, visit, duration, distance } = x
                console.log(` ${name}: ${state} > ${trigger} > ${visit} / ${duration}s - ${distance}m `)
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
        ]

    } catch (e: any) { log.error(`Error processing activities for ${key}: ${e.message}`) }

}