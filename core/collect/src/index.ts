import { Sequelize } from 'sequelize'
import { Host, Connection } from 'unet'
import { decodeENV, Safe, env, log } from 'utils'

import { Enums } from './enums'

import { Locations } from './locations'
import { Coverages } from './coverages'
import { Activities } from './activities'

const { name, version, mode, db_name, db_user, db_pass } = decodeENV()

log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

console.log(`[${db_name} ${db_user} ${db_pass}]`)

const cf = {
    local: new Host({ name, port: 8050, timeout: 10000 }),
    core_data: new Connection({ name: 'core_data', proxy: 'http://127.0.0.1:8040', timeout: 15000 }),
    sequelize: new Sequelize(db_name, db_user, db_pass, {
        dialect: 'postgres',
        host: mode === 'development' ? '139.59.115.158' : 'localhost',
        pool: { max: 64, min: 16, acquire: 30000, idle: 15000 },
        logging: (sql, timing: any) => { },
    }),
}

Safe(async () => {

    await cf.sequelize.authenticate()

    const enums = new Enums(cf)

    const locations = new Locations(cf, mode !== 'development')
    const coverages = new Coverages(cf, mode !== 'development')
    const activities = new Activities(cf, mode === 'development')

    /* Following tables are generated from events and chunks */

    const gps_current = {}
    const gps_history = {}
    const gps_activity = {} /** This requires JOB **/

    // const coverages = {}
    const shapes = {}
    const states = {}
    const files = {}

    await cf.sequelize.sync({ force: false, alter: true })

})