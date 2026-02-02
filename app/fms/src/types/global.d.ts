import { EventEmitter } from "events"
import { Connection } from 'unet/web'
import { Persist } from '../hooks/helper'

import { MapView } from 'uweb/maptalks'
import type { Pane } from 'tweakpane'

declare global {

    interface iArgs {

        isDarkMode: boolean
        setIsDarMode: any
        event: EventEmitter
        kv: Persist,
        notifApi: NotificationInstance
        messageApi: MessageInstance

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