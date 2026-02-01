import { EventEmitter } from "events"
import { Connection } from 'unet/web'
import { Persist } from '../hooks/helper'

import { MapView } from 'uweb/maptalks'
import type { Pane } from 'tweakpane'

declare global {

    interface iArgs {

        isDarkMode: boolean
        event: EventEmitter
        kv: Persist,

        core_rtcm?: Connection
        core_proxy: Connection
        core_data: Connection
        core_collect: Connection

        MapView?: MapView
        Pane?: Pane

    }

    interface iGPSCalc { }

}

export { }