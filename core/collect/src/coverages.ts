import { Host, Connection } from 'unet'
import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize'
import { AsyncWait, Jfy, Now, Uid, Safe, Loop, dateFormat, moment, log } from 'utils'

export class Coverages {

    public name = 'coverages'
    public local: Host
    public core_data: Connection
    public sequelize: Sequelize
    public collection: ModelStatic<Model<any, any>> & any

    _ = {
        days: 7,
        size: 4,
        limit: 100,
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
            est: { type: DataTypes.INTEGER, defaultValue: 0 },
            nrt: { type: DataTypes.INTEGER, defaultValue: 0 },
            data: { type: DataTypes.STRING, defaultValue: '' },

            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, { indexes: [{ unique: true, fields: ['proj', 'type', 'est', 'nrt'] }] })

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

        const updatedAt = sp[1] ?? moment().add(-(this._.days), 'days').format(dateFormat)
        const rows: any = await this.core_data.get('get-events-status', { id: sp[0], updatedAt, limit: this._.limit })

        /** ** Data aggregating **  **/
        const obj: any = {}

        for (const x of rows) {

            try {

                const parsed: any = Jfy(x.data)
                const { data, data_gps1, data_gps, data_gsm } = parsed
                const [proj, type] = data
                const { gps, utm } = data_gps
                const [est, nrt] = utm

                if (true /** Exca Truck [ Drill Dozer Grader Vehicle ] ... **/) {

                    /** Indexing ['proj', 'type', 'est', 'nrt'] **/
                    const es = Math.round(est / this._.size)
                    const nr = Math.round(nrt / this._.size)
                    const index = `${proj}_${type}_${es}_${nr}`

                    /** Satellites | Network | Precision | Speed | Elevation **/
                    const inject = `${gps[0]},${gps[1]}|${data_gps1[2]}|${data_gsm.quality}|${data_gps1[3]}|${data_gps1[5]}|${utm[2]}`
                    obj[index] = { proj, type, est: es, nrt: nr, data: inject }

                }

            } catch (err: any) { log.warn(`${alias} In the Loop / ${err.message}`) }

        }

        /** ** Data saving **  **/
        if (rows.length > 0) {

            const keys = Object.keys(obj)
            for (const x of keys) await this.collection.upsert({ ...obj[x], updatedAt: Now() })

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