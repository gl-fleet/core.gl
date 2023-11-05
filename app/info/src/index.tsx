import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { Safe, Win, Doc, KeyValue, log } from 'utils/web'

import File from './views/file'
import Vehicle from './views/vehicle'
import Settings from './settings'

import { EventEmitter } from "events"

const proxy = Win.location.origin
const { useState, useEffect } = React
const meta = document.createElement('meta')
meta.name = "viewport"
meta.content = "width=device-width, user-scalable=yes, initial-scale=1.0, maximum-scale=0.75, minimum-scale=0.75"
document.getElementsByTagName('head')[0].appendChild(meta)

const cfg: iArgs = {
    event: new EventEmitter(),
    isDarkMode: true,
    proxy,
    api: new Connection({ name: 'core_data', proxy, timeout: 10000 }),
    view: '',
    name: '',
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => {

    const [conServer, setConServer] = useState(false)
    const [conVehicle, setConVehicle] = useState(false)

    useEffect(() => {

        const { api } = cfg

        api.on('connect', () => setConServer(true))
        api.on('disconnect', () => setConServer(false))
        api.on('connect_error', () => setConServer(false))

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