import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { EventEmitter } from "events"

import Main from './main'
import Settings from './settings'

const meta = document.createElement('meta')
meta.name = "viewport"
meta.content = "width=device-width, user-scalable=yes, initial-scale=1.0, maximum-scale=0.75, minimum-scale=0.75"
document.getElementsByTagName('head')[0].appendChild(meta)

const cfg: iArgs = {
    event: new EventEmitter(),
    api: new Connection({ name: 'core_data' }),
    proxy: new Connection({ name: 'core_proxy' }),
    isDarkMode: true,
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => <Main {...cfg} isDarkMode={isDarkMode} />
const settings = ({ isDarkMode }: { isDarkMode: boolean }) => <Settings {...cfg} isDarkMode={isDarkMode} />

Render(main, settings, { maxWidth: '100%' })