import { Host, NetServer } from 'unet'
import { Now, Loop } from 'utils'

export class Bridge {

    constructor(API: Host, alias: string, p0: number, p1: number) {

        const _ = {
            source: {
                port: p0,
                lastMessage: '',
                clients: 0,
            },
            destination: {
                port: p1,
                lastEvent: '',
                clients: 0,
            }
        }

        /** [ Receives message from the Easy Production ] **/

        const source = new NetServer({ port: _.source.port }, (client) => {

            client.on('data', (data) => {

                _.source.lastMessage = `Message size ${String(data).length} / Clients ${destination.clients.length}`
                destination.clients.map(client => client.write(data))

            })

        })

        /** [ Sends message to the Equipments ] **/

        const destination = new NetServer({ port: _.destination.port }, (client) => {

            _.destination.lastEvent = `[+] ${Now()}`

        })

        /** [ Serve events ] **/

        API.on(alias, () => _)

        Loop(() => {

            _.source.clients = source.clients.length
            _.destination.clients = destination.clients.length

            API.emit(alias, true)

        }, 5000)

    }

}