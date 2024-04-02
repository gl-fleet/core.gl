import { EventEmitter } from "events"
import { Connection } from 'unet/web'
import { Persist } from '../hooks/helper'

declare global {

    interface iArgs {

        isDarkMode: boolean
        event: EventEmitter
        kv: Persist,
        core_proxy: Connection
        core_data: Connection
        core_collect: Connection

    }

    interface iGPSCalc { }

}

export { }