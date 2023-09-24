import { Host, NetServer, NetClient } from 'unet'
import { Safe, Now, Loop } from 'utils'

export default (API: Host, p0: number, p1: number) => Safe(() => {

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
        // client.on('close', () => { _.destination.lastEvent = `[-] ${Now()}` })

    })

    API.on('uh', () => _)

    Loop(() => {

        _.source.clients = source.clients.length
        _.destination.clients = destination.clients.length
        API.emit('uh', true)

    }, 5000)

})