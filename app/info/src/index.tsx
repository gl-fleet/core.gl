import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { Safe, Win, Doc, KeyValue, log } from 'utils/web'

import Main from './main'
import Settings from './settings'

import { EventEmitter } from "events"

const proxy = Win.location.origin

const cfg: iArgs = {
    event: new EventEmitter(),
    isDarkMode: true,
    proxy,
    api: new Connection({ name: 'core_data', proxy }),
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => {

    return <Main {...cfg} isDarkMode={isDarkMode} />

}

const settings = ({ isDarkMode }: { isDarkMode: boolean }) => {

    return <Settings {...cfg} isDarkMode={isDarkMode} />

}

Render(main, settings, { maxWidth: '100%' })