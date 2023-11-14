import { React, Render, Result } from 'uweb'
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
    api: new Connection({ name: 'core_data', timeout: 10000, token: KeyValue('token') }),
    isDarkMode: true,
    view: '',
    name: '',
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => {

    useEffect(() => {

        let prev = cfg.kv.get('token')
        cfg.kv.on('token', (next) => prev !== next && location.reload())

    }, [])

    const view = ((new URL(document.location.toString())).searchParams).get('view') ?? ''
    const name = ((new URL(document.location.toString())).searchParams).get('name') ?? ''

    log.info(`[VIEW] -> Query / ${view} / ${name}`)

    cfg.view = view
    cfg.name = name

    if (cfg.kv.get('token')) {

        if (view === 'file') return <File {...cfg} isDarkMode={isDarkMode} />
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