import { Host, Connection } from 'unet'
import { Sequelize, DataTypes, Model, ModelStatic, QueryTypes } from 'sequelize'
import { AsyncWait, Jfy, Now, Uid, Safe, Loop, dateFormat, moment, log } from 'utils'
import { calculate_activities } from './utils'

export class Activities {

    public name = 'activities'
    public local: Host
    public core_data: Connection
    public sequelize: Sequelize
    public collection: ModelStatic<Model<any, any>> & any

    _ = { days: 7, limit: 100 }
    buffer = { max_samples: 720 /** Around 30 minutes **/, max_activities: 5 }
    todos: any[] = []
    last = 0
    svg: any[] = []
    once = true

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
            details: { type: DataTypes.TEXT, defaultValue: '' },
            note: { type: DataTypes.STRING, defaultValue: '' },

            startedAt: { type: DataTypes.STRING, defaultValue: '' },
            endedAt: { type: DataTypes.STRING, defaultValue: '' },
            start: { type: DataTypes.STRING, defaultValue: '' },
            end: { type: DataTypes.STRING, defaultValue: '' },

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

    /*** *** *** @___Table_Jobs___ *** *** ***/

    event_poller = async () => {

        const alias = `[${this.name}.event_poller]`
        const enums = this.sequelize.models['enums']
        const { value: val = ',' }: any = (await enums.findOne({ where: { type: 'collect', name: this.name, deletedAt: null }, raw: true }) ?? {})
        const sp = val.split(',')

        const createdAt = sp[1] || moment().add(-(this._.days), 'days').format(dateFormat)
        const rows: any = await this.core_data.get('get-events-status', { id: sp[0], createdAt, limit: this._.limit })

        log.success(`${alias} Pulled ${rows.length} / ${rows[0].createdAt}`)
        log.success(`${alias} Pulled ${rows.length} / ${rows[rows.length - 1].createdAt}`)

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

            } catch (err: any) { log.warn(`${alias} ${key} In the Loop / ${err.message}`) }

        }

        return [rows, obj]

    }

    buffer_poller = async (obj: any) => {

        const alias = `[${this.name}.buffer_poller]`

        try {

            const enums = this.sequelize.models['enums']
            return await enums.findAll({ where: { type: 'activity.buffer', name: Object.keys(obj), deletedAt: null }, raw: true })

        } catch (err: any) { log.warn(`${alias} In the Loop / ${err.message}`) }

    }

    aggregator = (events: any, buffer: any) => {

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

    calculator = async (merged: any) => {

        // -- DELETE FROM public.enums WHERE type = 'activity.buffer' or type = 'activity.now' or name = 'activities'
        // -- DELETE FROM public.activities

        const alias = `[${this.name}.calculator]`
        let debug = `HLV796`

        for (const key in merged) {

            try {

                const { buff_acts = [], buff_samps = [] }: any = merged[key]

                console.log('')

                log.success(`${alias} Processing ${key} with ${buff_acts.length} activities and ${buff_samps.length} samples`)

                const [activities, sliced_acts, sliced_samps, [svg, box]]: any = calculate_activities(key, buff_acts, buff_samps, debug)

                box > 1 && this.svg.push(svg) && this.svg.length > 5 && this.svg.shift()

                log.success(`${alias} Sliced ${key} with ${sliced_acts.length} activities and ${sliced_samps.length} samples`)

                await this.upsert_buffer(key, sliced_acts, sliced_samps)
                await this.upsert_activity(activities, 'merge')

            } catch (err: any) { log.warn(`${alias} In the Merged.Loop / ${err.message}`) }

        }

    }

    upsert_buffer = async (key: string, sliced_acts: any, sliced_samps: any) => {

        const enums = this.sequelize.models['enums']

        if (sliced_samps.length > this.buffer.max_samples) sliced_samps = sliced_samps.slice(this.buffer.max_samples - sliced_samps.length)
        if (sliced_acts.length > this.buffer.max_activities) sliced_acts = sliced_acts.slice(this.buffer.max_activities - sliced_acts.length)

        await enums.upsert({ type: 'activity.buffer', name: key, value: JSON.stringify({ buff_acts: sliced_acts, buff_samps: sliced_samps }), updatedAt: Now() })
        await enums.upsert({ type: 'activity.now', name: key, value: JSON.stringify(sliced_acts[sliced_acts.length - 1]), updatedAt: Now() })

    }

    upsert_activity = async (activities: any, action = 'add') => {

        if (Array.isArray(activities) == false || activities.length === 0) return

        for (const x of activities)
            await this.collection.upsert(x, { updateOnDuplicate: ['name', 'startedAt'] })
        // await this.collection.bulkCreate(activities, { updateOnDuplicate: ['name', 'startedAt'] })

    }

    update_checkpoint = async (rows: any) => {

        if (rows.length > 0) {

            const enums = this.sequelize.models['enums']
            const item = rows[rows.length - 1]
            await enums.upsert({ type: 'collect', name: this.name, value: `${item.id},${item.createdAt} `, updatedAt: Now() })

        }

    }

    executer = async () => {

        /** Get the latest events by checkpoint **/
        const [rows, events] = await this.event_poller()

        /** Get the buffer from enums **/
        const buffer: any = await this.buffer_poller(events)

        /** Merge the Events.data.array <-> Enums.buffer.string **/
        const merged = this.aggregator(events, buffer)

        /** Cut_and_Calculate -> Save_Calculated -> Save_Uncalculated */
        await this.calculator(merged)

        /** ** Data saving **  **/
        await this.update_checkpoint(rows)

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