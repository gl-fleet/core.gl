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
        logging: (sql, timing: any) => { },
    }),
}

Safe(async () => {

    await cf.sequelize.authenticate()

    new Event(cf)
    new Chunk(cf)

    const replica = new rMaster({ api: cf.local, sequel: cf.sequelize })

    replica.cb = (...e: any) => console.log(`[M] Trigger:    ${e}`)

    await cf.sequelize.sync({ force: false, alter: true })

})