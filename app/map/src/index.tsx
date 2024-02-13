import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { parseJwt, KeyValue } from 'utils/web'
import { EventEmitter } from "events"

import { AddMeta, Persist } from './hooks/helper'
import Main from './main'
import Settings from './settings'

const { useState, useEffect } = React

AddMeta()

const cfg: iArgs = {
    kv: new Persist(),
    event: new EventEmitter(),
    proxy: new Connection({ name: 'core_proxy', token: KeyValue('token') }),
    api: new Connection({ name: 'core_data', token: KeyValue('token') }),
    isDarkMode: true,
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => {

    useEffect(() => {

        let prev = cfg.kv.get('token')
        cfg.kv.on('token', (next) => prev !== next && location.reload())

        window.addEventListener("focus", () => {
            cfg.proxy.connect()
            cfg.api.connect()
        })

    }, [])

    return <Main {...cfg} isDarkMode={isDarkMode} />

}

const settings = ({ isDarkMode }: { isDarkMode: boolean }) => <Settings {...cfg} isDarkMode={isDarkMode} />

Render(main, settings, { maxWidth: '100%' })