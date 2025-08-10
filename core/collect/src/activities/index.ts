import { Host, Connection } from 'unet'
import { Sequelize, DataTypes, Model, ModelStatic, QueryTypes } from 'sequelize'
import { AsyncWait, Jfy, Now, Uid, Safe, Loop, dateFormat, moment, log } from 'utils'

type VehiclePoint = {
    east: number
    north: number
    elevation: number
    heading: number
    speed: number
    updated: Date
}

type VehicleActivity = {
    startTime: string
    endTime: string
    avgSpeed: string
    headingChange: string
    elevationChange: string
    distance: string
    activity: string
    work: string
}

const analyzeVehicleActivity = (dataArray: string[], offlineThresholdSeconds: number = 30): VehicleActivity => {

    if (dataArray.length !== 4) throw new Error("Exactly 4 elements are required for accurate activity analysis.")

    let current_work = '-|-|-'

    const parsed: VehiclePoint[] = dataArray.map(entry => {

        const [east, north, elevation, heading, speed, updated, work = '-|-|-'] = entry.split(',')

        if (work !== '-|-|-') current_work = work

        return {
            east: parseFloat(east),
            north: parseFloat(north),
            elevation: parseFloat(elevation),
            heading: parseFloat(heading),
            speed: parseFloat(speed),
            updated: new Date(updated),
            work,
        }

    })

    const avgSpeed = parsed.reduce((sum, p) => sum + p.speed, 0) / 4
    const headingChange = Math.abs(parsed[3].heading - parsed[0].heading)
    const elevationChange = parsed[3].elevation - parsed[0].elevation

    const dx = parsed[3].east - parsed[0].east
    const dy = parsed[3].north - parsed[0].north
    const distance = Math.sqrt(dx * dx + dy * dy)

    const movementAngle = Math.atan2(dy, dx)
    const headingDiff = Math.abs(movementAngle - parsed[0].heading)

    const timeGapSeconds = (parsed[3].updated.getTime() - parsed[0].updated.getTime()) / 1000

    let activity = 'Idling'

    if (timeGapSeconds > offlineThresholdSeconds) {

        activity = 'Offline'

    } else if (avgSpeed > 0.1 && distance > 1) {

        activity = 'Moving'

        // const wasIdle = parsed[0].speed <= 0.01 && parsed[1].speed <= 0.01
        /// const isNowMoving = parsed[2].speed > 0.1 && parsed[3].speed > 0.1

        // if (wasIdle && isNowMoving) activity = 'Started Moving'
        // else if (parsed[0].speed > 0.1 && parsed[3].speed <= 0.01) activity = 'Stopping'
        // if (headingDiff > Math.PI / 2) activity = 'Backing'
        // if (headingChange >= Math.PI / 8) activity = 'Turning'
        // if (elevationChange > 0.5) activity = 'Ascending'
        // else if (elevationChange < -0.5) activity = 'Descending'

    }

    return {
        startTime: parsed[0].updated.toISOString(),
        endTime: parsed[3].updated.toISOString(),
        avgSpeed: avgSpeed.toFixed(3),
        headingChange: headingChange.toFixed(3),
        elevationChange: elevationChange.toFixed(2),
        distance: distance.toFixed(2),
        activity,
        work: current_work,
    }
}

export class Activities {

    public name = 'activities'
    public local: Host
    public core_data: Connection
    public sequelize: Sequelize
    public collection: ModelStatic<Model<any, any>> & any

    _ = {
        days: 7,
        limit: 1000,
    }

    constructor({ local, core_data, sequelize }: { local: Host, core_data: Connection, sequelize: Sequelize }, run_background: boolean) {

        this.local = local
        this.core_data = core_data
        this.sequelize = sequelize

        this.table_build()
        this.table_serve()
        this.table_event()

        run_background && this.scheduler()

    }

    table_build = () => {

        this.collection = this.sequelize.define(this.name, {

            id: { primaryKey: true, type: DataTypes.STRING, defaultValue: () => Uid() },

            proj: { type: DataTypes.STRING, defaultValue: '' },
            type: { type: DataTypes.STRING, defaultValue: '' },
            name: { type: DataTypes.STRING, defaultValue: '' },

            activity: { type: DataTypes.STRING, defaultValue: '' },
            note: { type: DataTypes.STRING, defaultValue: '' },

            start: { type: DataTypes.STRING, defaultValue: '' },
            end: { type: DataTypes.STRING, defaultValue: '' },

            averages: { type: DataTypes.STRING, defaultValue: '' },
            distance: { type: DataTypes.INTEGER, defaultValue: 0 },
            duration: { type: DataTypes.INTEGER, defaultValue: 0 },

            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, {
            indexes: [
                { unique: false, name: `${this.name}_proj_index`, using: 'BTREE', fields: ['proj'] },
                { unique: false, name: `${this.name}_type_index`, using: 'BTREE', fields: ['type'] },
                { unique: false, name: `${this.name}_name_index`, using: 'BTREE', fields: ['name'] },
                { unique: false, name: `${this.name}_activity_index`, using: 'BTREE', fields: ['activity'] },
                { unique: false, name: `${this.name}_updatedat_index`, using: 'BTREE', fields: ['updatedAt'], },
            ]
        })


        /* const ok = {

            proj: proj,
            type: type,
            name: name,

            activity: activity,
            note: `${work},${avgSpeed},${headingChange},${elevationChange}`,]

            start: start.format(dateFormat),
            end: end.format(dateFormat),

            averages: '',
            distance: Number(distance),
            duration: seconds,


        } */

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async (req: any) => await this.get(req.query))
        this.local.on(`set-${this.name}`, async (req: any) => await this.set(req.query), true, 4)

    }

    table_event = () => {

        this.collection.afterCreate(() => this.local.emit(this.name, 'create'))
        this.collection.afterUpdate(() => this.local.emit(this.name, 'update'))
        this.collection.afterUpsert(() => this.local.emit(this.name, 'upsert'))

    }

    /*** *** *** @___Request_Validate___ *** *** ***/

    is_s = (s: any) => typeof s === 'string' && s.length > 0
    is_n = (n: any) => typeof n === 'number'

    /*** *** *** @___Table_Queries___ *** *** ***/

    get = async (args: any) => {

        return await this.collection.findAll({
            where: { ...args, deletedAt: null },
            order: [['updatedAt', 'ASC']],
        })

    }

    set = async ({ type, name, value }: { type: string, name: string, value: string }) => {

        if (this.is_s(type) && this.is_s(name)) {

            const [record, created] = await this.collection.upsert({ type, name, value, updatedAt: Now() }, { returning: true, raw: true })
            return record.isNewRecord ? 'Created' : 'Updated'

        } else throw new Error(`Type and Name must be string!`)

    }

    /*** *** *** @___Table_Jobs___ *** *** ***/

    last = 0
    todos: any[] = []

    executer = async () => {

        /** ** Data pulling **  **/
        const alias = `[${this.name}.executer]`
        const enums = this.sequelize.models['enums']

        const { value: val = ',' }: any = (await enums.findOne({ where: { type: 'collect', name: this.name, deletedAt: null }, raw: true }) ?? {})
        const sp = val.split(',')

        const createdAt = sp[1] || moment().add(-(this._.days), 'days').format(dateFormat)
        const rows: any = await this.core_data.get('get-events-status', { id: sp[0], createdAt, limit: this._.limit })

        log.success(``)
        log.success(`Pulled ${rows.length} / ${rows[0].createdAt}`)
        log.success(`Pulled ${rows.length} / ${rows[rows.length - 1].createdAt}`)

        /** ** Data aggregating **  **/
        const obj: any = {}

        for (const x of rows) {

            const { type: t, src, dst } = x
            const key = `${t}.${src}.${dst}`

            try {

                const { createdAt, updatedAt } = x
                const parsed: any = Jfy(x.data)
                const { data = {}, value = {}, data_gps1 = [], data_gps2 = [], data_gps = {}, data_gsm } = parsed
                const [proj, type, name] = data
                const { utm = [-1, -1, -1], head = -1 } = data_gps
                const [est, nrt, el] = utm
                const id = `${proj}.${type}.${name}`

                const current_work = () => {

                    const d = '|'
                    let s = `${value.screen ?? '-'}${d}${'-'}${d}${'-'}`
                    if (value && value.dig_plan) s = `${value.screen}${d}${value.dig_plan?.dir ?? ''}${d}${value.dig_plan?.dis ?? ''}`
                    if (value && value.shot_plan) s = `${value.screen}${d}${value.shot_plan?.dir ?? ''}${d}${value.shot_plan?.d2 ?? ''}`
                    return s.replaceAll(',', ' ')

                }

                if (!obj.hasOwnProperty(id)) obj[id] = []

                obj[id].push(`${est},${nrt},${el},${head},${data_gps1[5] ?? -1},${updatedAt},${current_work()}`)

            } catch (err: any) {
                log.warn(`${alias} ${key} In the Loop / ${err.message}`)
            }

        }

        const buffer: any = await enums.findAll({ where: { type: 'activity.buffer', name: Object.keys(obj), deletedAt: null }, raw: true })

        /** Merge the Events.data.array <-> Enums.buffer.string **/

        const merged: any = {}

        for (const x of buffer) {

            const { name, value } = x
            merged[name] = JSON.parse(value)

        }

        for (const x in obj) {

            if (merged.hasOwnProperty(x)) merged[x].samples = [...merged[x].samples, ...obj[x]]
            else merged[x] = { prev: [], samples: obj[x] }

        }

        /** Cut_and_Calculate -> Save_Calculated -> Save_Uncalculated */

        const calc_len = 4

        for (const x in merged) {

            try {

                const { samples: ls, prev = [] }: any = merged[x]
                const prev_count = prev.length

                if (Array.isArray(ls) && ls.length >= calc_len) {

                    let l = 0

                    for (let i = 0; i < ls.length; i += 3) {

                        let spl = []

                        for (let j = 0; j < calc_len; j++) ls[i + j] && spl.push(ls[i + j])

                        if (spl.length === calc_len) {

                            const current = analyzeVehicleActivity(spl)
                            l = i + calc_len - 2

                            if (prev.length > 0) {

                                const last = prev[prev.length - 1]

                                if (last.activity !== current.activity) {

                                    prev.push(current)

                                } else {

                                    prev[prev.length - 1] = {
                                        ...last,
                                        endTime: current.endTime,
                                        distance: Number(last.distance ?? 0) + Number(current.distance ?? 0),
                                    }

                                }

                            } else prev.push(current)

                        }

                    }

                    const _samples = ls.slice(l)
                    const _prev = prev.length > calc_len ? prev.slice(calc_len - prev.length) : prev

                    console.log(`~~~> ${x} --- prev_count ${prev_count} and now_count ${prev.length}`)

                    const activities = []
                    const start_point = prev_count > 0 ? prev_count - 1 : 0

                    for (let i = start_point; i < prev.length - 1; i++) {

                        const [proj, type, name] = x.split('.')
                        const { activity, startTime, endTime, distance } = prev[i]
                        const { avgSpeed, headingChange, elevationChange, work } = prev[i]

                        const start = moment(startTime)
                        const end = moment(endTime)

                        const duration = moment.duration(end.diff(start))
                        const seconds = duration.asSeconds()

                        activities.push({

                            proj: proj,
                            type: type,
                            name: name,

                            activity: activity,
                            note: work,

                            start: start.format(dateFormat),
                            end: end.format(dateFormat),

                            averages: '',
                            distance: Number(distance),
                            duration: seconds,

                        })

                    }

                    await enums.upsert({ type: 'activity.buffer', name: x, value: JSON.stringify({ prev: _prev, samples: _samples }), updatedAt: Now() })
                    await enums.upsert({ type: 'activity.now', name: x, value: JSON.stringify(_prev[_prev.length - 1]), updatedAt: Now() })
                    await this.collection.bulkCreate(activities)

                }

            } catch (err: any) {
                log.warn(`${alias} In the Merged.Loop / ${err.message}`)
            }

        }

        /** ** Data saving **  **/
        if (rows.length > 0) {

            const item = rows[rows.length - 1]
            await enums.upsert({ type: 'collect', name: this.name, value: `${item.id},${item.createdAt} `, updatedAt: Now() })

        }

    }

    scheduler = () => {

        const alias = `[${this.name}.scheduler]`
        let free = true
        let fail = 0

        this.core_data.on('collect', ({ table }) => table === 'events' && this.todos.push(true))

        Loop(() => ((Date.now() - this.last) >= (10 * 1000)) && Safe(() => {

            this.todos.push(true)
            this.last = Date.now()

        }, `[${this.name}.loop]`), 1000)

        Loop(() => free && Safe(async () => {

            let tStart = Date.now()
            free = false

            try {

                if (this.todos.length > 0) {

                    await this.executer()

                    log.info(`${alias} Todos:${this.todos.length} Fails:${fail} Duration:${Date.now() - tStart} ms`)

                    this.todos = []
                    fail = 0

                }

            } catch (err: any) {

                log.error(`${alias} In the Loop / ${err.message} `) && ++fail

            } finally {

                if (fail >= 25) {

                    log.warn(`${alias} Going to restart the process due to failures ...`)
                    await AsyncWait(2500)
                    process.exit(0)

                } else {

                    free = true
                    await AsyncWait(500)

                }

            }

        }, alias), 500)

    }

}