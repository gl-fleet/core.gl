import { React, Render } from 'uweb'
import { Connection } from 'unet/web'
import { EventEmitter } from "events"
import { Win, log } from 'utils/web'

import Main from './main'
import Settings from './settings'

const cfg: iArgs = {
    event: new EventEmitter(),
    api: new Connection({ name: 'core_data' }),
    isDarkMode: true,
}

const main = ({ isDarkMode }: { isDarkMode: boolean }) => <Main {...cfg} isDarkMode={isDarkMode} />
const settings = ({ isDarkMode }: { isDarkMode: boolean }) => <Settings {...cfg} isDarkMode={isDarkMode} />

Render(main, settings, { maxWidth: '100%' })