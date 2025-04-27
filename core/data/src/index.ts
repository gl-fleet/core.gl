import { Sequelize } from 'sequelize'
import { Host, rMaster } from 'unet'
import { decodeENV, Safe, env, log } from 'utils'

import { Event } from './events'
import { Chunk } from './chunks'

const { name, version, mode, db_name, db_user, db_pass } = decodeENV()

log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const cf: any = {
    local: new Host({ name, port: 8040, timeout: 10000 }),
    sequelize: new Sequelize(db_name, db_user, db_pass, {
        dialect: 'postgres',
        host: mode === 'development' ? '139.59.115.158' : 'localhost',
        pool: { max: 16, min: 4, acquire: 30000, idle: 15000 },
        logging: false,
        /* logging: (sql, timing: any) => {
            console.log('***')
            console.log(sql)
        }, */
    }),
}

Safe(async () => {

    await cf.sequelize.authenticate()

    new Event(cf)
    new Chunk(cf)

    setTimeout(async () => {

        return null

        const item = await cf.sequelize.models['events'].findOne({
            where: { src: 'SV102' },
            order: [[cf.sequelize.literal(`"events"."updatedAt", "events"."id" DESC`)]],
            // order: [[cf.sequelize.literal(cf.sequelize.col('updatedAt'), cf.sequelize.col('id')), 'DESC']],
            limit: 1,
            raw: true,
        })

        console.log('********************************************')
        console.log(item)

    })

    const replica = new rMaster({
        api: cf.local,
        sequel: cf.sequelize,
        // log: true, /** Enable replica logs **/
    })

    replica.cb = (table: string, src: any) => {

        cf.local.emit('collect', { table, src })

    }

    await cf.sequelize.sync({ force: false, alter: true })

})