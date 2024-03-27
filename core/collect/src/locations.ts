import { Host, Connection } from 'unet'
import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize'
import { AsyncWait, Jfy, Now, Uid, Safe, Loop, dateFormat, moment, log } from 'utils'

export class Locations {

    public name = 'locations'
    public local: Host
    public core_data: Connection
    public sequelize: Sequelize
    public collection: ModelStatic<Model<any, any>> & any

    _ = {
        days: 7,
        limit: 50,
    }

    constructor({ local, core_data, sequelize }: {
        local: Host,
        core_data: Connection,
        sequelize: Sequelize,
    }) {

        this.local = local
        this.core_data = core_data
        this.sequelize = sequelize

        this.table_build()
        this.table_serve()
        this.table_event()
        this.scheduler()

    }

    table_build = () => {

        this.collection = this.sequelize.define(this.name, {

            id: { primaryKey: true, type: DataTypes.STRING, defaultValue: () => Uid() },

            proj: { type: DataTypes.STRING, defaultValue: '' },
            type: { type: DataTypes.STRING, defaultValue: '' },
            name: { type: DataTypes.STRING, defaultValue: '' },

            east: { type: DataTypes.FLOAT, defaultValue: 0 },
            north: { type: DataTypes.FLOAT, defaultValue: 0 },
            elevation: { type: DataTypes.FLOAT, defaultValue: 0 },
            speed: { type: DataTypes.FLOAT, defaultValue: 0 },
            heading: { type: DataTypes.FLOAT, defaultValue: 0 },
            activity: { type: DataTypes.STRING, defaultValue: '' },

            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, { indexes: [{ unique: true, fields: ['proj', 'type', 'name', 'updatedAt'] }] })

    }

    table_event = () => {

        this.collection.afterCreate(() => this.local.emit(this.name, 'create'))
        this.collection.afterUpdate(() => this.local.emit(this.name, 'update'))
        this.collection.afterUpsert(() => this.local.emit(this.name, 'upsert'))

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async (req: any) => await this.get(req.query))
        this.local.on(`set-${this.name}`, async (req: any) => await this.set(req.query), true, 4)

    }

    /*** *** *** @___Table_Queries___ *** *** ***/

    get = async (query: any) => await this.collection.findAll({ where: { ...query, deletedAt: null }, order: [['updatedAt', 'ASC']] })
    set = async (query: any) => await this.collection.upsert({ ...query, updatedAt: Now() }, { returning: true, raw: true })

    /*** *** *** @___Table_Jobs___ *** *** ***/

    last = 0
    todos: any[] = []

    executer = async () => {

        /** ** Data pulling **  **/
        const enums = this.sequelize.models['enums']

        const { value = ',' }: any = (await enums.findOne({ where: { type: 'collect', name: this.name, deletedAt: null }, raw: true }) ?? {})
        const sp = value.split(',')

        const updatedAt = sp[1] ?? moment().add(-(this._.days), 'days').format(dateFormat)
        const rows: any = await this.core_data.get('get-events-status', { id: sp[0], updatedAt, limit: this._.limit })

        /** ** Data aggregating **  **/
        const points: any = []

        for (const x of rows) {

            try {

                const { createdAt, updatedAt } = x
                const parsed: any = Jfy(x.data)
                const { data, data_gps1, data_gps, data_activity } = parsed
                const [proj, type, name] = data
                const { utm } = data_gps
                const [east, north, elevation] = utm

                points.push({ proj, type, name, east, north, elevation, speed: data_gps1[5], heading: data_gps.head, activity: data_activity?.state ?? '?', createdAt, updatedAt })

            } catch (err) { }

        }

        /** ** Data saving **  **/
        if (rows.length > 0) {

            for (const x of points) await this.collection.upsert({ ...x })

            const item = rows[rows.length - 1]
            await enums.upsert({ type: 'collect', name: this.name, value: `${item.id},${item.updatedAt}`, updatedAt: Now() })

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

            free = false

            try {

                if (this.todos.length > 0) {

                    await this.executer()
                    this.todos = []
                    fail = 0

                }

            } catch (err: any) {

                log.error(`${alias} In the Loop / ${err.message}`) && ++fail

            } finally {

                log.info(`${alias} Todos:${this.todos.length} Fails:${fail}`)

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