import { EventEmitter } from "events"
import { Connection } from 'unet/web'

declare global {

    interface iArgs {

        isDarkMode: boolean
        event: EventEmitter
        proxy: string
        api: Connection
        view: string
        name: string

    }

    interface iGPSCalc { }

}

export { }