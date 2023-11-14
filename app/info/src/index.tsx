import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { Safe, Win, Doc, KeyValue, log } from 'utils/web'
import { EventEmitter } from "events"

import { AddMeta, Persist } from './hooks/helper'
import File from './views/file'
import Vehicle from './views/vehicle'
import Settings from './settings'

const { useState, useEffect } = React

AddMeta()

const cfg: iArgs = {
    event: new EventEmitter(),
    kv: new Persist(),
    api: new Connection({ name: 'core_data', timeout: 10000 }),
    isDarkMode: true,
    view: '',
    name: '',
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => {

    const [conServer, setConServer] = useState(false)

    useEffect(() => {

        const { api, kv } = cfg

        api.on('connect', () => setConServer(true))
        api.on('disconnect', () => setConServer(false))
        api.on('connect_error', () => setConServer(false))

        kv.on('token', (value) => {

            log.info(`[Info] -> KV.Listen / ${value}`)

        })

    }, [])

    const view = ((new URL(document.location.toString())).searchParams).get('view') ?? ''
    const name = ((new URL(document.location.toString())).searchParams).get('name') ?? ''

    log.info(`[VIEW] -> Query / ${view} / ${name}`)

    cfg.view = view
    cfg.name = name

    if (view === 'file') return <File {...cfg} isDarkMode={isDarkMode} />
    if (view === 'vehicle') return <Vehicle {...cfg} isDarkMode={isDarkMode} />
    return <p>{view}</p>

}

const settings = ({ isDarkMode }: { isDarkMode: boolean }) => {

    return <Settings {...cfg} isDarkMode={isDarkMode} />

}

Render(main, settings, { maxWidth: '100%' })