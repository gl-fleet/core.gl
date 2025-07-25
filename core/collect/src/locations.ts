import { Host, Connection } from 'unet'
import { Sequelize, DataTypes, Model, ModelStatic, Op, QueryTypes } from 'sequelize'
import { AsyncWait, Jfy, Now, Uid, Safe, Loop, dateFormat, moment, log } from 'utils'

export class Locations {

    public name = 'locations'
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

            east: { type: DataTypes.FLOAT, defaultValue: 0 },
            north: { type: DataTypes.FLOAT, defaultValue: 0 },
            elevation: { type: DataTypes.FLOAT, defaultValue: 0 },
            speed: { type: DataTypes.FLOAT, defaultValue: 0 },
            heading: { type: DataTypes.FLOAT, defaultValue: 0 },
            data: { type: DataTypes.STRING, defaultValue: '' },

            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, {
            indexes: [
                { unique: false, name: `${this.name}_proj_index`, using: 'BTREE', fields: ['proj'] },
                { unique: false, name: `${this.name}_type_index`, using: 'BTREE', fields: ['type'] },
                { unique: false, name: `${this.name}_name_index`, using: 'BTREE', fields: ['name'] },
                { unique: false, name: `${this.name}_updatedat_index`, using: 'BTREE', fields: ['updatedAt'] },
            ]
        })

    }

    table_event = () => {

        this.collection.afterCreate(() => this.local.emit(this.name, 'create'))
        this.collection.afterUpdate(() => this.local.emit(this.name, 'update'))
        this.collection.afterUpsert(() => this.local.emit(this.name, 'upsert'))

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async (req: any) => await this.get(req.query))
        this.local.on(`set-${this.name}`, async (req: any) => await this.set(req.query), true, 4)

        this.local.on(`get-${this.name}-last`, async (req: any) => await this.get_last(req.query))
        this.local.on(`get-${this.name}-all-last`, async ({ query, user }: any) => await this.get_all_last(query, user), true, 2)
        this.local.on(`get-${this.name}-all-last-v2`, async ({ query, user }: any) => await this.get_all_last_v2(query, user), true, 2)

    }

    /*** *** *** @___Table_Queries___ *** *** ***/
    get = async (query: any) => await this.collection.findAll({ where: { ...query, deletedAt: null }, order: [['updatedAt', 'ASC']] })
    set = async (query: any) => await this.collection.upsert({ ...query, updatedAt: Now() }, { returning: true, raw: true })

    get_last = async (query: any) => {

        const result = await this.collection.findOne({
            where: {
                updatedAt: { [Op.gte]: moment().add(-30, 'days').format(dateFormat) },
                ...query,
                deletedAt: null,
            },
            order: [['updatedAt', 'DESC']],
            raw: true,
        })

        return result

    }

    get_all_last = async (query: any, { proj }: any) => await this.collection.findAll({
        attributes: [Sequelize.literal('DISTINCT ON("name") "name"'), "updatedAt", "proj", "type", "data"],
        where: proj === '*' ? {
            updatedAt: { [Op.gte]: moment().add(-90, 'days').format(dateFormat) },
            deletedAt: null
        } : {
            updatedAt: { [Op.gte]: moment().add(-90, 'days').format(dateFormat) },
            proj: proj,
            deletedAt: null
        },
        order: ['name', ['updatedAt', 'DESC'], ['id', 'DESC']],
        raw: true,
    })

    get_all_last_v2 = async (query: any, { proj, days = 14 }: any) => {

        const result = await this.sequelize.query(`
            SELECT *
            FROM public.locations
            WHERE "updatedAt" > '${moment().add(-days, 'days').format(dateFormat)}' AND (name, "updatedAt") in (
                SELECT name, MAX("updatedAt") 
                FROM public.locations
                WHERE "updatedAt" > '${moment().add(-days, 'days').format(dateFormat)}'
                GROUP BY "name"
            )`, { type: QueryTypes.SELECT })

        return proj === '*' ? result : result.filter((e: any) => e.proj === proj)

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
        const rows: any = await this.core_data.get('get-events-status', { id: sp[0], updatedAt: time, limit: this._.limit })

        /** ** Data aggregating **  **/
        const points: any = []
        const last_position: any = {}

        // if (rows.length > 0)  console.log(`${value} ${rows.length} | ${rows[0].updatedAt} ${rows[rows.length - 1].updatedAt}`)

        for (const x of rows) {

            const { type: t, src, dst } = x
            const key = `${t}.${src}.${dst}`

            try {

                const { createdAt, updatedAt } = x
                const parsed: any = Jfy(x.data)
                const { value, data, data_gps = {}, data_gps1, data_gps2, data_gsm, data_rtcm, data_activity, inj_clients } = parsed
                const { gps = [], utm } = data_gps
                const [proj, type, name] = data
                const [east, north, elevation] = utm

                const current_work = () => {
                    /** Need more coding here [...] **/
                    if (value && value.dig_plan) return `${value.screen},${value.dig_plan?.dir ?? ''},${value.dig_plan?.dis ?? ''}`
                    if (value && value.shot_plan) return `${value.screen},${value.shot_plan?.dir ?? ''},${value.shot_plan?.d2 ?? ''}`
                    return `${value.screen},${'-'},${'-'}`
                }

                if (true /** Exca Truck [ Drill Dozer Grader Vehicle ] ... **/) {

                    const inject = [
                        `${gps[0]},${gps[1]}`,
                        `${data_gps1[1]},${data_gps1[2]}`,
                        `${data_gps2[1]},${data_gps2[2]}`,
                        `${data_gps.prec2d},${data_gps.prec3d}`,
                        `${data_gsm?.state ?? ''},${data_gsm?.quality ?? ''},${data_gsm?.operator ?? ''},${value.rx},${value.tx},${value.pw}`,
                        `${data_rtcm?.state ?? ''},${data_activity?.state ?? ''},${inj_clients.length ?? 0}`,
                        current_work(),
                    ].join('|')

                    const payload = { proj, type, name, east, north, elevation, speed: data_gps1[5], heading: data_gps.head, data: inject, createdAt, updatedAt }
                    last_position[`${proj}.${type}.${name}`] = payload
                    points.push(payload)

                }

            } catch (err: any) { log.warn(`${alias} ${key} In the Loop / ${err.message}`) }

        }

        /** ** Data saving **  **/
        if (rows.length > 0) {

            for (const x in last_position) {

                this.local.emit(x, last_position[x])
                await enums.upsert({ type: 'location.now', name: x, value: JSON.stringify(last_position[x]), updatedAt: last_position[x].updatedAt })

            }

            // for (const x of points) await this.collection.upsert({ ...x })
            await this.collection.bulkCreate(points)

            const item = rows[rows.length - 1]
            await enums.upsert({ type: 'collect', name: this.name, value: `${item.id},${item.updatedAt}`, updatedAt: Now() })

            for (const x of rows) console.log(`Select -> ${x.src} ${x.updatedAt}`)
            for (const x of points) console.log(`Upsert -> ${x.name} ${x.updatedAt}`)
            console.log(`Flag -> ${item.updatedAt} \n`)

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