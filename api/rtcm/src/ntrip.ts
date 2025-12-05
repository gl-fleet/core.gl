import { Host, NetServer } from 'unet'
import { Now, Loop, log, moment } from 'utils'
const { NtripClient } = require('ntrip-client')

interface iConfig {
    host: string
    port: number
    mountpoint: string
    username: string
    password: string
}

export const NTRIP = (API: Host, alias: string, port: number, cfg: iConfig) => {

    const _: any = {
        source: {
            port: port,
            lastMessage: '-',
            lastUpdate: 0,
            messageDelay: 0,
            clients: 0,
        },
        destination: {
            port: port,
            lastEvent: '-',
            clients: [],
        }
    }

    API.on(alias, () => _)

    const { clients } = new NetServer({ host: '0.0.0.0', port: port }, (client) => {
        log.info(`[${alias}] ${client.remoteAddress}:${client.remotePort}`)
    })

    const client = new NtripClient(cfg)

    client.on('data', (data: any) => {

        clients.map(client => {

            try { client.write(data) }
            catch (err: any) { log.error(`While writing to client / ${err.message}`) }

        })

    })

    client.on('close', () => { console.log('client close') })
    client.on('error', (err: any) => { console.log(err) })
    client.run()

}