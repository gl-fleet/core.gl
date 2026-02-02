import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { KeyValue } from 'utils/web'
import { EventEmitter } from "events"

import { AddMeta, Persist } from './hooks/helper'
import Main from './main'

const { useRef, useEffect, useState } = React

const proxy = undefined
const timeout = 15000 * 4

const cfg: iArgs = {

    isDarkMode: true,
    setIsDarMode: null,
    kv: new Persist(),
    event: new EventEmitter(),
    messageApi: null,
    notifApi: null,

    core_proxy: new Connection({ proxy, name: 'core_proxy', token: KeyValue('token'), timeout }),
    core_data: new Connection({ proxy, name: 'core_data', token: KeyValue('token'), timeout }),
    core_collect: new Connection({ proxy, name: 'core_collect', token: KeyValue('token'), timeout }),

}

Render((args: any) => {

    React.useMemo(() => {

        AddMeta()

        cfg.setIsDarMode = args.setIsDarkMode

        cfg.kv.on('token', (next) => cfg.kv.get('token') !== next && location.reload())

        window.addEventListener("focus", () => {

            cfg.core_proxy.connect()
            cfg.core_data.connect()
            cfg.core_collect.connect()

        })

    }, [])

    return <Main {...cfg} isDarkMode={args.isDarkMode} />

}, null, { maxWidth: '100%' })