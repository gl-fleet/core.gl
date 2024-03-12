import { Sequelize } from 'sequelize'
import { Host, Connection } from 'unet'
import { decodeENV, Collect, Safe, env, log } from 'utils'

import { Listener } from './listener'
import { Persist } from './persist'

const { name, version, mode, me, db_name, db_user, db_pass } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

console.log(decodeENV())

const cf: any = {
    local: new Host({ name, port: 8040 }),
    // sequelize: new Sequelize({ dialect: 'sqlite', storage: `../../${me}_${name}.sqlite`, logging: false }),
    sequelize: new Sequelize(db_name, db_user, db_pass, {
        host: '139.59.115.158',
        dialect: 'postgres',
        pool: { max: 16, min: 4, acquire: 30000, idle: 15000 }
    }),
}

const run = () => {

    const listener = new Listener(cf)
    const persist = new Persist(cf)

}

Safe(async () => {

    await cf.sequelize.authenticate()
    run()
    await cf.sequelize.sync({ force: false })

    // User.sync() - This creates the table if it doesn't exist (and does nothing if it already exists)
    // User.sync({ force: true }) - This creates the table, dropping it first if it already existed
    // User.sync({ alter: true }) - This checks what is the current state of the table in the database(which columns it has, what are their data types, etc), and then performs the necessary changes in the table to make it match the model.

})