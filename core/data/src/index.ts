import { Sequelize } from 'sequelize'
import { Host, Connection } from 'unet'
import { decodeENV, Collect, Safe, env, log } from 'utils'

import { Listener } from './listener'
import { Persist } from './persist'

const { name, version, mode, me, proxy } = decodeENV()
log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const cf = {
    local: new Host({ name, port: 8040 }),
    sequelize: new Sequelize({ dialect: 'sqlite', storage: `../../${me}_${name}.sqlite`, logging: false })
}

const run = () => {

    const listener = new Listener(cf)
    const persist = new Persist(cf)

    // persist.save_event({ type: 'status', name: 'device', data })

}

Safe(async () => {

    await cf.sequelize.authenticate()
    run()
    await cf.sequelize.sync({ force: false })

})