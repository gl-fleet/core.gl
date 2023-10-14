import { Host, Connection, ReplicaSlave } from 'unet'
import { Sequelize, DataTypes } from 'sequelize'
import { Now, Safe, Loop, log } from 'utils'

import { tEvent, roughSizeOfObject, wr, f } from './helper'

export class Listener {

    public local: Host
    public sequelize: Sequelize

    public channel: string = 'stream'
    public data: any = {}
    public inj: any = {}
    public cbs: any = {}

    constructor({ local, sequelize }: { local: Host, sequelize: Sequelize }) {

        log.success(`[Emitter] is starting ...`)

        this.local = local
        this.sequelize = sequelize

        local.on('stream', ({ headers, body }, res) => {

            const { project, type, name } = headers
            if (project && type && name) {
                local.emit('stream', { project, type, name, ...body })
                return 'success'
            } else {
                res.status(403).end('Not authorized!')
            }

        })

    }

    /** @___Callback_Events___ **/

    on = (key: tEvent, cb: any) => {
        this.cbs[key] = cb
    }

    emit = (key: tEvent, values: any): boolean => {
        try { return typeof this.cbs[key] === 'undefined' ? true : this.cbs[key](values) } catch { return false }
    }

}