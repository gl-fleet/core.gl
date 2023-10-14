import { Host } from 'unet'
import { decodeENV, Safe, log } from 'utils'

import UH from './uh-bridge'
import BN from './bn-bridge'

const { name, version, mode, ports, uh, bn } = decodeENV()
log.success(`"${name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

Safe(() => {

    const API = new Host({ name, port: Number(ports[0] - 1) })

    UH(API, Number(uh[0]), Number(uh[1]))
    BN(API, Number(bn[0]), Number(bn[1]))

})