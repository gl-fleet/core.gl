import { Sequelize } from 'sequelize'
import { Host, rMaster } from 'unet'
import { decodeENV, Safe, env, log } from 'utils'

import { Event } from './events'
import { Chunk } from './chunks'

const { name, version, mode, db_name, db_user, db_pass } = decodeENV()

log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

console.log(`[${db_name} ${db_user} ${db_pass}]`)

const cf: any = {
    local: new Host({ name, port: 8040, timeout: 15000 * 4 }),
    sequelize: new Sequelize(db_name, db_user, db_pass, {
        dialect: 'postgres',
        host: mode === 'development' ? '139.59.115.158' : 'localhost',
        pool: { max: 16, min: 4, acquire: 30000, idle: 15000 },
        logging: (sql, timing: any) => { },
        retry: {
            match: [
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/
            ],
            name: 'query',
            backoffBase: 100,
            backoffExponent: 1.1,
            timeout: 30000,
            max: Infinity
        }
    }),
}

Safe(async () => {

    await cf.sequelize.authenticate()

    new Event(cf)
    new Chunk(cf)

    const replica = new rMaster({
        api: cf.local,
        sequel: cf.sequelize,
        // log: true, /** Enable replica logs **/
    })

    replica.cb = (table: string, src: any) => {

        cf.local.emit('collect', { table, src })

    }

    const table_size = `
        SELECT 
            table_schema || '.' || table_name AS table_name,
            pg_size_pretty(pg_total_relation_size(table_schema || '.' || table_name)) AS total_size,
            pg_size_pretty(pg_relation_size(table_schema || '.' || table_name)) AS table_size,
            pg_size_pretty(pg_total_relation_size(table_schema || '.' || table_name) - pg_relation_size(table_schema || '.' || table_name)) AS index_size
        FROM 
            information_schema.tables
        WHERE 
            table_schema NOT IN ('pg_catalog', 'information_schema')
            AND table_type = 'BASE TABLE'
        ORDER BY 
            pg_total_relation_size(table_schema || '.' || table_name) DESC;
    `

    const clear_the_history = `
        DELETE FROM public.events WHERE "updatedAt" <= '2025-10-01 00:00:00.000' 
    `

    await cf.sequelize.sync({ force: false, alter: true })

})