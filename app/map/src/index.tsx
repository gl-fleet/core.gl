import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { KeyValue } from 'utils/web'
import { EventEmitter } from "events"

import { AddMeta, Persist } from './hooks/helper'
import Main from './main'
import Settings from './settings'

const { useEffect } = React

AddMeta()

const cfg: iArgs = {
    kv: new Persist(),
    event: new EventEmitter(),
    core_proxy: new Connection({ name: 'core_proxy', token: KeyValue('token') }),
    core_data: new Connection({ name: 'core_data', token: KeyValue('token') }),
    core_collect: new Connection({ name: 'core_collect', token: KeyValue('token'), timeout: 15000 }),
    isDarkMode: true,
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => {

    useEffect(() => {

        let prev = cfg.kv.get('token')
        cfg.kv.on('token', (next) => prev !== next && location.reload())

        window.addEventListener("focus", () => {

            cfg.core_proxy.connect()
            cfg.core_data.connect()
            cfg.core_collect.connect()

        })

    }, [])

    return <Main {...cfg} isDarkMode={isDarkMode} />

}

const settings = ({ isDarkMode }: { isDarkMode: boolean }) => <Settings {...cfg} isDarkMode={isDarkMode} />

Render(main, settings, { maxWidth: '100%' })