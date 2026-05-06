import { Host, Connection } from 'unet'
import { Sequelize, DataTypes, Model, ModelStatic, QueryTypes } from 'sequelize'
import { AsyncWait, Jfy, Now, Uid, Safe, Loop, dateFormat, moment, log } from 'utils'
import * as turf from '@turf/turf'

import { process_activities } from './process'

let debug: any = null

export class Activities {

    public name = 'activities'
    public local: Host
    public core_data: Connection
    public sequelize: Sequelize
    public collection: ModelStatic<Model<any, any>> & any

    _ = { days: 7, limit: 100 }
    buffer = { max_samples: 720 /** Around 30 minutes **/, max_activities: 5 }
    shapes: any = {}
    todos: any[] = []
    svg: any[] = []
    once = true
    last = 0

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

            state: { type: DataTypes.STRING, defaultValue: '', comment: 'GPS activity' },
            trigger: { type: DataTypes.STRING, defaultValue: '', comment: 'Geofence activity' },
            visit: { type: DataTypes.STRING, defaultValue: '', comment: 'Name of Geofence' },
            distance: { type: DataTypes.FLOAT, defaultValue: 0.0, comment: 'meters' },
            duration: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'seconds' },

            startedAt: { type: DataTypes.STRING, defaultValue: '' },
            endedAt: { type: DataTypes.STRING, defaultValue: '' },
            start: { type: DataTypes.STRING, defaultValue: '' },
            end: { type: DataTypes.STRING, defaultValue: '' },

            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, {
            indexes: [
                { unique: false, name: `${this.name}_proj_index`, using: 'BTREE', fields: ['proj'] },
                { unique: false, name: `${this.name}_type_index`, using: 'BTREE', fields: ['type'] },
                { unique: false, name: `${this.name}_name_index`, using: 'BTREE', fields: ['name'] },
                { unique: false, name: `${this.name}_state_index`, using: 'BTREE', fields: ['state'] },
                { unique: false, name: `${this.name}_trigger_index`, using: 'BTREE', fields: ['trigger'] },
                { unique: false, name: `${this.name}_startedat_index`, using: 'BTREE', fields: ['startedAt'], },
                { unique: false, name: `${this.name}_updatedat_index`, using: 'BTREE', fields: ['updatedAt'], },
                { unique: true, name: `${this.name}_name_startedat_index`, using: 'BTREE', fields: ['name', 'startedAt'] },
            ]
        })

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async (req: any) => await this.get(req.query))
        this.local.on(`set-${this.name}`, async (req: any) => await this.set(req.query), true, 4)
        this.local.on(`get-svg`, async (req: any) => {

            let put = ``
            this.svg.map((s, i) => { put += s })
            console.log(this.svg.length)
            return put

        })

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

    upsert_buffer = async (key: string, sliced_acts: any, sliced_samps: any) => {

        try {

            const enums = this.sequelize.models['enums']

            if (sliced_samps.length > this.buffer.max_samples) sliced_samps = sliced_samps.slice(this.buffer.max_samples - sliced_samps.length)
            if (sliced_acts.length > this.buffer.max_activities) sliced_acts = sliced_acts.slice(this.buffer.max_activities - sliced_acts.length)

            await enums.upsert({ type: 'activity.buffer', name: key, value: JSON.stringify({ buff_acts: sliced_acts, buff_samps: sliced_samps }), updatedAt: Now() })
            await enums.upsert({ type: 'activity.now', name: key, value: JSON.stringify(sliced_acts[sliced_acts.length - 1]), updatedAt: Now() })

        } catch (err: any) { log.warn(`[upsert_buffer] ${err.message}`) }

    }

    upsert_activity = async (activities: any, action = 'add') => {

        try {

            if (Array.isArray(activities) == false || activities.length === 0) return

            if (true) { /** If true, will execute the query one by one **/

                for (const x of activities) await this.collection.upsert(x, { updateOnDuplicate: ['name', 'startedAt'] })

            } else { /** If false, will execute the query in bulk **/

                await this.collection.bulkCreate(activities, { updateOnDuplicate: ['name', 'startedAt'] })

            }

        } catch (err: any) { log.warn(`[upsert_activity] ${err.message}`) }

    }

    /*** *** *** @___Table_Jobs___ *** *** ***/

    /** [01] **/ event_poller = async () => {

        const alias = `[${this.name}.event_poller]`
        debug && console.log(alias)
        const enums = this.sequelize.models['enums']
        const { value: val = ',' }: any = (await enums.findOne({ where: { type: 'collect', name: this.name, deletedAt: null }, raw: true }) ?? {})
        const sp = val.split(',')

        const createdAt = sp[1] || moment().add(-(this._.days), 'days').format(dateFormat)
        const rows: any = await this.core_data.get('get-events-status', { id: sp[0], createdAt, limit: this._.limit })

        debug && console.log('')
        debug && log.success(`Start checkpoint: ${val}`)

        if (rows.length === 0) {
            log.warn(`${alias} No new events found since ${createdAt}`)
            return [[], {}]
        }

        log.success(`${alias} Pulled ${rows.length} /  ${rows[0].createdAt} - ${rows[rows.length - 1].createdAt}`)
        debug && console.log('')

        /** ** Data aggregating **  **/
        const obj: any = {}

        for (const x of rows) {

            const { type: t, src, dst } = x
            const key = `${t}.${src}.${dst}`

            try {

                const { src, createdAt, updatedAt } = x
                const parsed: any = Jfy(x.data)
                const { data = {}, value = {}, data_gps1 = [], data_gps2 = [], data_gps = {}, data_gsm } = parsed
                const [proj, type, name] = data
                const { utm = [-1, -1, -1], head = -1, gps = [-1, -1, -1] } = data_gps
                const [est, nrt, el] = utm
                const [lon, lat] = gps
                const id = `${proj}.${type}.${name}`

                const current_work = () => {

                    const d = '|'
                    let s = `${value.screen ?? '-'}${d}${'-'}${d}${'-'}`
                    if (value && value.dig_plan) s = `${value.screen}${d}${value.dig_plan?.dir ?? ''}${d}${value.dig_plan?.dis ?? ''}`
                    if (value && value.shot_plan) s = `${value.screen}${d}${value.shot_plan?.dir ?? ''}${d}${value.shot_plan?.d2 ?? ''}`
                    return s.replaceAll(',', ' ')

                }

                if (!obj.hasOwnProperty(id)) obj[id] = []

                obj[id].push(`${est},${nrt},${lat},${lon},${el},${head},${data_gps1[5] ?? -1},${createdAt},${current_work()}`)

                debug === src && log.success(`${debug} ${createdAt} / ${updatedAt}`)

            } catch (err: any) { log.warn(`${alias} ${key} In the Loop / ${err.message}`) }

        }

        return [rows, obj]

    }

    /** [02] **/ buffer_poller = async (obj: any) => {

        const alias = `[${this.name}.buffer_poller]`
        debug && console.log(alias)

        try {

            const enums = this.sequelize.models['enums']
            return await enums.findAll({ where: { type: 'activity.buffer', name: Object.keys(obj), deletedAt: null }, raw: true })

        } catch (err: any) { log.warn(`${alias} In the Loop / ${err.message}`) }

    }

    /** [03] **/ aggregator = (events: any, buffer: any) => {

        const merged: any = {}

        for (const x of buffer) {

            const { name, value } = x
            const { buff_acts, buff_samps } = JSON.parse(value)

            for (let i = 0; i < buff_acts.length; i++) buff_acts[i] = { ...buff_acts[i], source: 'buffer' }
            for (let i = 0; i < buff_samps.length; i++) if (buff_samps[i].indexOf(',buffer') === -1) buff_samps[i] = buff_samps[i] + ',buffer'

            merged[name] = { buff_acts, buff_samps }

        }

        for (const x in events) {

            if (merged.hasOwnProperty(x)) merged[x].buff_samps = [...merged[x].buff_samps, ...events[x],]
            else merged[x] = { buff_acts: [], buff_samps: events[x] }

        }

        return merged

    }

    /** [04] **/ pull_shapes = async () => {

        const alias = `[${this.name}.pull_shapes]`
        debug && console.log(alias)
        let tmp = ``, errs = 0

        try {

            const shapes: any = await this.core_data.get('_get-shapes', {})

            log.success(`${alias} Pulled ${shapes.length} shapes from the core_data`)

            if (shapes && shapes.length > 0) {

                for (const x of shapes) {

                    try {

                        const points = JSON.parse(x.geojson)

                        if (x.type === "LineString") {

                            const obj = turf.lineString(points)
                            if (obj && obj.geometry) this.shapes[x.id] = { ...x, obj }

                        } else {

                            const obj = turf.polygon(x.type === 'Rectangle' ? [points] : points)
                            if (obj && obj.geometry) this.shapes[x.id] = { ...x, obj }

                        }

                    } catch (err: any) {

                        tmp = `${err.message} '${x.type}' '${x.name}' (${++errs} similar errors so far)`

                    }

                }

                tmp && log.warn(`${alias} ${tmp}`)

            }

        } catch (err: any) { log.warn(`${alias} In the Loop / ${err.message} / ${tmp}`) }
    }

    /** [05] **/ calculator = async (merged: any) => {

        const alias = `[${this.name}.calculator]`
        debug && console.log(alias)

        for (const key in merged) {

            try {

                const { buff_acts = [], buff_samps = [] }: any = merged[key]

                let dbg = debug && key.indexOf(debug) !== -1
                dbg && log.success(`${alias} Processing ${key} with ${buff_acts.length} activities and ${buff_samps.length} samples`)

                const [activities = [], sliced_acts = [], sliced_samps = [], /* [svg, box] = [] */]: any = process_activities(key, buff_acts, buff_samps, this.shapes, debug)

                // box > 1 && this.svg.push(svg) && this.svg.length > 5 && this.svg.shift()
                dbg && log.success(`${alias} ${activities.length} activities & ${sliced_acts.length} sliced_act & ${sliced_samps.length} sliced_samps`)

                await this.upsert_buffer(key, sliced_acts, sliced_samps)
                await this.upsert_activity(activities, 'merge')

            } catch (err: any) { log.warn(`${alias} In the Merged.Loop / ${err.message}`) }

        }

    }

    /** [06] **/ update_checkpoint = async (rows: any) => {

        if (rows.length > 0) {

            debug && console.log(`[${this.name}.update_checkpoint]`)
            const enums = this.sequelize.models['enums']
            const item = rows[rows.length - 1]
            await enums.upsert({ type: 'collect', name: this.name, value: `${item.id},${item.createdAt}`, updatedAt: Now() })
            debug && log.success(`End checkpoint: ${item.id},${item.createdAt}`)

        }

    }

    executer = async () => {

        debug = 'HLV796'

        /** Get the latest events by checkpoint **/
        const [rows, events] = await this.event_poller()

        if (Array.isArray(rows) && rows.length === 0) return true

        /** Get the buffer from enums **/
        const buffer: any = await this.buffer_poller(events)

        /** Merge the Events.data.array <-> Enums.buffer.string **/
        const merged = this.aggregator(events, buffer)

        /** Get the Shapes **/
        await this.pull_shapes()

        /** Cut_and_Calculate -> Save_Calculated -> Save_Uncalculated */
        await this.calculator(merged)

        /** ** Data saving **  **/
        await this.update_checkpoint(rows)

        await AsyncWait(500)

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

                    /* if (this.once) this.once = false
                    else return null */

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