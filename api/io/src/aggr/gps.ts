import { Host, Connection } from 'unet'
import { decodeENV, Now, log, Safe } from 'utils'
import { roughSizeOfObject, execSync, execAsync } from './utils'

export class gps_io {

    public local: Host
    public channel: string = 'gps'
    public me: string = decodeENV().me ?? ''
    public temp: any = {}

    constructor(loc: Host) {

        log.success(`[GPS_IO] -> ${this.me} is starting ... `)

        this.local = loc

        this.local.on(this.channel, ({ body }: any) => {

            console.log(body)
            this.local.emit(this.channel, body)

        })

    }

    proc = (args: any) => execSync({ alias: 'proc', args }, () => {

        return args

    })

    aggr = (args: any) => execSync({ alias: 'aggr', args }, () => {

        return args

    })

    send_cloud = (args: any) => execSync({ alias: 'send_cloud', args }, () => {

        return 'success'

    })

    send_local = (args: any) => execSync({ alias: 'send_local', args }, () => {

        return 'success'

    })

    persist_and_replicate = async (args: any) => await execAsync({ alias: 'save', args }, async () => {

        return args

    })

}