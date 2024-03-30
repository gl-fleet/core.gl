import { EventEmitter } from "events"
import { Connection } from 'unet/web'
import { Persist } from '../hooks/helper'

declare global {

    interface iArgs {

        isDarkMode: boolean
        event: EventEmitter
        kv: Persist,
        api: Connection
        core_collect?: Connection
        view: string
        name: string

    }

    interface iGPSCalc { }

}

export { }