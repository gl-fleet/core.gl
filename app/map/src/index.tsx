import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { EventEmitter } from "events"
import { Win, log } from 'utils/web'

import Main from './main'
import Settings from './settings'

const proxy = Win.location.origin

const cfg: iArgs = {
    event: new EventEmitter(),
    isDarkMode: true,
    proxy,
    api: new Connection({ name: 'core_data', proxy }),
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => <Main {...cfg} isDarkMode={isDarkMode} />
const settings = ({ isDarkMode }: { isDarkMode: boolean }) => <Settings {...cfg} isDarkMode={isDarkMode} />

Render(main, settings, { maxWidth: '100%' })