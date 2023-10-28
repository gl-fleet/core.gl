import { Host, Connection, ReplicaSlave } from 'unet'
import { CommandExists, decodeENV, Safe, Jfy, Sfy, Loop, Delay, env, log } from 'utils'
import { Sequelize, DataTypes } from 'sequelize'
import { initChunks } from './chunks'

import { gps_io } from './aggr/gps'

Safe(async () => {

    Loop(() => { }, 1000 * 10)
    return

    const { name, version, mode, ports, me, debug } = decodeENV()
    log.success(`"${env.npm_package_name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

    !CommandExists('ogr2ogr') && log.error('Install GDAL tools (includes the ogr2ogr command line tool) https://gdal.org/download.html')

    const api = new Host({ name, port: Number(ports[0]) })
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: '../../data.sqlite', logging: (msg) => debug === 'true' && log.info(`SQLITE: ${msg}`) })

    await sequelize.authenticate()

    initChunks(api, sequelize, me, debug)
    new gps_io(api)

    await sequelize.sync({ force: false })

})
