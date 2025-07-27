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
        duration: 10, /** Another @{extending} minutes will be added when there are no data **/
        extending: 10,
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

    executer_0 = async () => {

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

        /** ** Data aggregating **  **/
        const obj: any = {}

        for (const x of rows) {

            const { proj, type, name } = x
            const key = `${proj}.${type}.${name}`

            try {

                if (!obj.hasOwnProperty(key)) obj[key] = []
                obj[key].push(x)

            } catch (err: any) { log.warn(`${alias} ${key} In the Loop / ${err.message}`) }

        }

        for (const n in obj) {
            console.log(`${n} -> ${obj[n][0].updatedAt} [${obj[n].length}]`)
        }

        /** ** Data saving **  **/
        if (rows.length > 0) {

            // console.log(` ${rows[0].updatedAt} -> ${rows[rows.length - 1].updatedAt}  [${rows.length} / ${this._.duration}]`)

            // const keys = Object.keys(obj)
            // for (const x of keys) await this.collection.upsert({ ...obj[x], updatedAt: Now() })

            const item = rows[rows.length - 1]
            log.warn(`[ ${item.updatedAt} && ${Now()} ]`)
            await enums.upsert({ type: 'collect', name: this.name, value: `${item.id},${item.updatedAt}`, updatedAt: item.updatedAt })
            this._.duration = this._.extending

        } else this._.duration += this._.extending

    }


    executer = async () => {

        /** ** Data pulling **  **/
        const alias = `[${this.name}.executer]`

        const locations: any = await this.sequelize.query(`
            SELECT * 
            FROM public.enums
            WHERE type = 'location.now'
            ORDER BY name DESC
        `, { type: QueryTypes.SELECT })

        const activities: any = await this.sequelize.query(`
            SELECT * 
            FROM public.enums
            WHERE type = 'activity.now'
            ORDER BY name DESC
        `, { type: QueryTypes.SELECT })

        console.log(locations)
        console.log(activities)

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