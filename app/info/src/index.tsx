import { React, Render, Result } from 'uweb'
import { Connection } from 'unet/web'
import { parseJwt, KeyValue, log } from 'utils/web'
import { EventEmitter } from "events"

import { AddMeta, Persist } from './hooks/helper'
import Vehicle from './views/vehicle'
import Settings from './settings'

const { useState, useEffect } = React

AddMeta()

const cfg: iArgs = {
    event: new EventEmitter(),
    kv: new Persist(),
    api: new Connection({ name: 'core_data', timeout: 10000, token: KeyValue('token') }),
    isDarkMode: true,
    view: '',
    name: '',
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => {

    const [authorized, setAuthorized] = useState(0)

    useEffect(() => {

        const params = (new URL(document.location.toString())).searchParams
        const project = params.get('project')
        let prev = cfg.kv.get('token')
        const body = parseJwt(KeyValue('token'))

        if (body && body.project && (body.project === project || body.project === '*')) setAuthorized(1)
        else setAuthorized(2)

        window.addEventListener("focus", () => cfg.api.connect())

        cfg.kv.on('token', (next) => prev !== next && location.reload())

    }, [])

    const params = (new URL(document.location.toString())).searchParams
    const name = params.get('name') ?? ''
    const view = params.get('view') ?? ''

    log.info(`[VIEW] -> Query / ${view} / ${name}`)

    cfg.view = view
    cfg.name = name

    if (authorized === 0) return null

    if (cfg.kv.get('token') && authorized === 1) {

        if (view === 'vehicle') return <Vehicle {...cfg} isDarkMode={isDarkMode} />
        return <p>{view}</p>

    } else {

        return <div style={{ display: 'flex', background: isDarkMode ? '#000' : '#fff', height: '100%', zIndex: 999 }}>
            <Result
                style={{ margin: 'auto' }}
                status="403"
                subTitle="Sorry, you are not authorized to access"
            />
        </div>

    }

}

const settings = ({ isDarkMode }: { isDarkMode: boolean }) => {
    return <Settings {...cfg} isDarkMode={isDarkMode} />
}

Render(main, settings, { maxWidth: '100%' })