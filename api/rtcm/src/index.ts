import { Host } from 'unet'
import { decodeENV, Safe, log } from 'utils'

import { Bridge } from './bridge'
import { NTRIP } from './ntrip'

const { name, version, mode, ports, uh, bn } = decodeENV()

log.success(`"${name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const UHG = {
    host: '202.70.38.30',
    port: 2101,
    mountpoint: 'ERUH',
    username: 'HP',
    password: 'NTripCaster'
}

const BN = {
    host: '202.70.38.30',
    port: 2101,
    mountpoint: 'ERUH',
    username: 'HP_BN',
    password: 'NTripCaster'
}

const BK = [{
    host: '183.177.98.90',
    port: 2101,
    mountpoint: '5DWORLD',
    username: 'erd',
    password: '123456'
}, {
    host: '183.177.98.90',
    port: 2102,
    mountpoint: '5DWORLD',
    username: 'EMadmin',
    password: 'Pass2025'
}]

Safe(() => {

    const API = new Host({ name, port: Number(ports[0] - 1) })

    new Bridge(API, 'UHG', Number(uh[0]), Number(uh[1]))

    new Bridge(API, 'BN', Number(bn[0]), Number(bn[1]))

    NTRIP(API, 'BK', 2103, BK[1])

})