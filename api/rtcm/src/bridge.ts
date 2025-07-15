import { Host, NetServer } from 'unet'
import { Now, Loop, log, moment } from 'utils'

export class Bridge {

    constructor(API: Host, alias: string, p0: number, p1: number) {

        const _: any = {
            source: {
                port: p0,
                lastMessage: '-',
                lastUpdate: 0,
                messageDelay: 0,
                clients: 0,
            },
            destination: {
                port: p1,
                lastEvent: '-',
                clients: [],
            }
        }

        /** [ Receives message from the Easy Production ] **/

        const source = new NetServer({ host: '0.0.0.0', port: _.source.port }, (client) => {

            client.on('data', (data) => {

                _.source.lastMessage = `Message size ${String(data).length}`
                _.source.lastUpdate = Date.now()

                destination.clients.map(client => {

                    try { client.write(data) }
                    catch (err: any) { log.error(`While writing to client / ${err.message}`) }

                })

            })

        })

        /** [ Sends message to the Equipments ] **/

        const destination = new NetServer({ host: '0.0.0.0', port: _.destination.port }, (client) => {

            _.destination.lastEvent = `[+] ${Now()}`

        })

        /** [ Serve events ] **/

        const normalize = (e: any) => {

            try {

                e.source.messageDelay = Date.now() - e.source.lastUpdate
                return e

            } catch (err) { return e }

        }

        API.on(alias, () => normalize(_))

        Loop(() => {

            _.source.clients = source.clients.length

            const clients: any = []
            destination.clients.map(client => {

                try { clients.push(`${client.remoteAddress}:${client.remotePort}`) } catch { }

            })

            _.destination.clients = clients

            API.emit(alias, normalize(_))

        }, 5000)

    }

}