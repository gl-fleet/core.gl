import { Host, Connection } from 'unet'
import { Sequelize, DataTypes, Model, ModelStatic, QueryTypes } from 'sequelize'
import { AsyncWait, Jfy, Now, Uid, Safe, Loop, dateFormat, moment, log } from 'utils'

const calculateDistance = (e1: number, n1: number, e2: number, n2: number) => {
    return Math.sqrt((e2 - e1) ** 2 + (n2 - n1) ** 2)
}

const calculateBearing = (e1: number, n1: number, e2: number, n2: number) => {
    const angle = Math.atan2(e2 - e1, n2 - n1) * (180 / Math.PI)
    return (angle + 360) % 360
}

const headingDifference = (h1: number, h2: number) => {
    let diff = Math.abs(h1 - h2) % 360
    return diff > 180 ? 360 - diff : diff
}

const getActivity = (prev: any, current: any, next: any) => {

    const dist = calculateDistance(prev.east, prev.north, current.east, current.north)
    const bearing = calculateBearing(prev.east, prev.north, current.east, current.north)
    const speed = dist / ((current.time - prev.time) || 1); // m/s
    const angleDiff = headingDifference(prev.heading, current.heading)
    const movementAngleDiff = headingDifference(current.heading, bearing)

    if (speed < 0.1) {
        return 'Idling'
    }

    if (speed < 0.5 && angleDiff > 20) {
        return 'Cornering (slow)'
    }

    if (movementAngleDiff > 135) {
        if (angleDiff > 20) return 'Reversing Turn'
        return 'Backing'
    }

    if (angleDiff > 25) {
        return 'Cornering'
    }

    if (speed >= 2) {
        return 'Hauling'
    }

    if (speed < 0.5) {
        return 'Parking'
    }

    return 'Moving'

}

export class Activities {

    public name = 'activities'
    public local: Host
    public core_data: Connection
    public sequelize: Sequelize
    public collection: ModelStatic<Model<any, any>> & any

    _ = {
        days: 7,
        limit: 100,
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
            start: { type: DataTypes.STRING, defaultValue: '' },
            end: { type: DataTypes.STRING, defaultValue: '' },
            distance: { type: DataTypes.INTEGER, defaultValue: 0 },
            duration: { type: DataTypes.INTEGER, defaultValue: 0 },
            note: { type: DataTypes.STRING, defaultValue: '' },

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

        const { value = ',' }: any = (await enums.findOne({ where: { type: 'collect', name: this.name, deletedAt: null }, raw: true }) ?? {})
        const sp = value.split(',')

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
                const { data, data_gps1, data_gps2, data_gps = {}, data_gsm } = parsed
                const [proj, type, name] = data
                const { utm = [-1, -1, -1], head = -1 } = data_gps
                const [est, nrt, el] = utm
                const id = `${proj}.${type}.${name}`

                if (!obj.hasOwnProperty(id)) obj[id] = []

                obj[id].push(`${est},${nrt},${el},${head},${data_gps1[5] ?? -1},${updatedAt}`)

            } catch (err: any) { log.warn(`${alias} ${key} In the Loop / ${err.message}`) }

        }

        console.log(obj)

        console.log(Object.keys(obj))

        const pres: any = await enums.findAll({ where: { type: 'activity.buffer', name: Object.keys(obj), deletedAt: null }, raw: true })
        const prea: any = await enums.findAll({ where: { type: 'activity.now', name: Object.keys(obj), deletedAt: null }, raw: true })

        /** Do the calculation with result of activity buffer after adding the last chanks, then cut and save **/

        console.log(pres)

        /** ** Data saving **  **/
        if (rows.length > 0) {

            const item = rows[rows.length - 1]
            // await enums.upsert({ type: 'collect', name: this.name, value: `${item.id},${item.createdAt}`, updatedAt: Now() })

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

                    log.info(`${alias} Todos:${this.todos.length} Fails:${fail} Duration:${Date.now() - tStart}ms`)

                    this.todos = []
                    fail = 0

                }

            } catch (err: any) {

                log.error(`${alias} In the Loop / ${err.message}`) && ++fail

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