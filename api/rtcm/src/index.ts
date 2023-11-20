import { Host } from 'unet'
import { decodeENV, Safe, log } from 'utils'
import { Bridge } from './bridge'

const { name, version, mode, ports, uh, bn } = decodeENV()

log.success(`"${name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

Safe(() => {

    const API = new Host({ name, port: Number(ports[0] - 1) })

    new Bridge(API, 'UHG', Number(uh[0]), Number(uh[1]))

    new Bridge(API, 'BN', Number(bn[0]), Number(bn[1]))

})