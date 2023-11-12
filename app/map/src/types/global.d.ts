import { EventEmitter } from "events"
import { Connection } from 'unet/web'

declare global {

    interface iArgs {

        isDarkMode: boolean
        event: EventEmitter
        api: Connection
        proxy: Connection

    }

    interface iGPSCalc { }

}

export { }