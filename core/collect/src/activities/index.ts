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
        duration: 5, /** Another 5 minutes will be added when there are no data **/
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
        const time = sp[1] || moment().add(-(this._.days), 'days').format(dateFormat)

        const rows: any = await this.sequelize.query(`
            SELECT *
            FROM public.locations
            WHERE "updatedAt" > '${time}' AND "updatedAt" <= '${moment(time).add(this._.duration, 'minutes').format(dateFormat)}'
            ORDER BY "updatedAt" ASC
        `, { type: QueryTypes.SELECT })

        // data: '105.1891,43.586636|rtk,32|rtk,32|0.8,0.8|error,,...,1.1,0.96,throttled=0x0|success,stopped [↗↗],0|undefined,-,-',

        // Your raw data (example)
        const samples = [
            { east: 100, north: 100, heading: 90, time: 0 },
            { east: 102, north: 100, heading: 95, time: 2.5 },
            { east: 104, north: 100, heading: 100, time: 5 },
            { east: 103, north: 100, heading: 275, time: 7.5 },
            { east: 102, north: 100, heading: 270, time: 10 },
        ]

        /** ** Data aggregating **  **/
        const obj: any = {}

        for (const x of rows) {

            const { type: t, src, dst } = x
            const key = `${t}.${src}.${dst}`

            try {

                // console.log(rows)

            } catch (err: any) { log.warn(`${alias} ${key} In the Loop / ${err.message}`) }

        }

        /** ** Data saving **  **/
        if (rows.length > 0) {

            console.log(` ${rows[0].updatedAt} -> ${rows[rows.length - 1].updatedAt}  [${rows.length} / ${this._.duration}]`)

            // const keys = Object.keys(obj)
            // for (const x of keys) await this.collection.upsert({ ...obj[x], updatedAt: Now() })

            const item = rows[rows.length - 1]
            await enums.upsert({ type: 'collect', name: this.name, value: `${item.id},${item.updatedAt}`, updatedAt: Now() })
            this._.duration = 5

        } else this._.duration += 5

    }

    scheduler = () => {

        const alias = `[${this.name}.scheduler]`
        let free = true
        let fail = 0

        Loop(() => ((Date.now() - this.last) >= (5 * 1000)) && Safe(() => {

            this.todos.push(true)
            this.last = Date.now()

        }, `[${this.name}.loop]`), 1000)

        Loop(() => free && Safe(async () => {

            let tStart = Date.now()
            free = false

            try {

                if (this.todos.length > 0) {

                    await this.executer()

                    log.success(`${alias} Todos:${this.todos.length} Fails:${fail} Duration:${Date.now() - tStart}ms Query/Range:${this._.duration} minutes`)

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