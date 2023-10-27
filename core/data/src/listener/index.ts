import { Host, Connection, ReplicaSlave } from 'unet'
import { Sequelize, DataTypes } from 'sequelize'
import { Now, Safe, Loop, log, decodeENV } from 'utils'

import { tEvent, roughSizeOfObject, wr, f } from './helper'

export class Listener {

    public local: Host
    public sequelize: Sequelize

    public channel: string = 'stream'
    private pi_token = decodeENV().pitunnel_token ?? ""
    public cbs: any = {}
    public obj: any = {}
    public pob: any = {}

    constructor({ local, sequelize }: { local: Host, sequelize: Sequelize }) {

        log.success(`[Emitter] is starting ...`)

        this.local = local
        this.sequelize = sequelize

        this.setup_pi_tunnel()

        local.on('vehicle-tunnel', async ({ headers, query }) => {

            const { name } = query
            return await this.pi_get_device_info(name)

        })

        local.on('vehicle-query', ({ headers, query }, res) => {

            const { project, type, name } = query

            try {

                if (typeof project === 'string' && typeof type === 'string' && typeof name === 'string') return this.obj[project][type][name]
                if (typeof project === 'string' && typeof type === 'string') return this.obj[project][type]
                if (typeof project === 'string' && project === '*') return this.obj
                if (typeof project === 'string') return this.obj[project] ?? this.obj
                return {}

            } catch (err: any) { return {} }

        })

        local.on('stream', ({ headers, body }, res) => {

            const { project, type, name } = headers

            if (typeof project === 'string' && typeof type === 'string' && typeof name === 'string') {

                if (!this.obj.hasOwnProperty(project)) { this.obj[project] = {} }
                if (!this.obj[project].hasOwnProperty(type)) { this.obj[project][type] = {} }
                if (!this.obj[project][type].hasOwnProperty(name)) { this.obj[project][type][name] = {} }

                const data = { project, type, name, ...body, last: Date.now() }
                this.obj[project][type][name] = data

                local.emit('vehicle-stream', data)
                local.emit(name, data)
                return 'success'

            } else { res.status(403).end('Not authorized!') }

        })

    }

    pi_get_devices = async () => {

        try {

            const res = await fetch('https://api.pitunnel.com/devices', {
                method: 'get',
                headers: new Headers({ 'Authorization': `Basic ${btoa(`${this.pi_token}:${this.pi_token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' })
            })

            const json = await res.json()
            return json

        } catch (err: any) {

            log.error(`[Emitter.pi_get_devices] ${err.message}`)
            return {}

        }

    }

    pi_get_device_info = async (name: string | undefined | any) => {

        try {

            if (typeof name === 'string' && this.pob.hasOwnProperty(name) && this.pob[name].hasOwnProperty('id')) {

                const id = this.pob[name].id

                let formData = new FormData()
                formData.append('device_id', id)

                const res = await fetch('https://api.pitunnel.com/device_info', {
                    method: 'post',
                    body: formData,
                    headers: new Headers({ 'Authorization': `Basic ${btoa(`${this.pi_token}:${this.pi_token}`)}` }),
                })

                const { device_info }: any = await res.json()
                return device_info

            }

            log.warn(`[Emitter.pi_get_device_info] Not found in the list!`)
            return {}

        } catch (err: any) {

            log.error(`[Emitter.pi_get_device_info] ${err.message}`)
            return {}

        }

    }

    setup_pi_tunnel = () => {

        const parse = ({ devices }: any) => {
            if (typeof devices !== 'undefined' && Array.isArray(devices)) for (const x of devices) this.pob[x.display_name] = x
        }

        const list = () => this.pi_get_devices().then(parse)

        Safe(() => list())
        Loop(() => list(), 30 * 1000)

    }

    on = (key: tEvent, cb: any) => { this.cbs[key] = cb }

    emit = (key: tEvent, values: any): boolean => { try { return typeof this.cbs[key] === 'undefined' ? true : this.cbs[key](values) } catch { return false } }

}