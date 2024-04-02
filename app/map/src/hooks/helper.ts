import { moment } from 'utils/web'

export const AddMeta = () => {

    const low = document.documentElement.clientWidth < 1024 ? '0.75' : '1'
    const meta = document.createElement('meta')
    meta.name = "viewport"
    meta.content = `width=device-width, user-scalable=yes, initial-scale=1.0, maximum-scale=${low}, minimum-scale=${low}`
    document.getElementsByTagName('head')[0].appendChild(meta)

}

export class Persist {

    cbs: any = []

    constructor() {

        window.addEventListener("storage", (event) => this.notify(event.key, event.newValue))

    }

    set = (key: string, value: string | null) => {

        localStorage.setItem(key, value === null ? '' : value)
        this.notify(key, value)

    }

    get = (key: string) => {

        return localStorage.getItem(key)

    }

    notify = (key: string | null, value: string | null) => {

        this.cbs.map(([ki, cb]: any) => {
            try { ki === key && cb(value) } catch { }
        })

    }

    on = (key: string, cb: (value: string | null) => any) => {

        this.cbs.push([key, cb])

    }

}

export const parseLocation = (location: any) => {

    const e = {
        project: '',
        type: '',
        name: '',
        g1: { isrtk: '', sats: 0 },
        g2: { isrtk: '', sats: 0 },
        gps: [0, 0, 0],
        utm: [0, 0, 0],
        speed: 0,
        head: 0,
        accuracy: { _2d: 0, _3d: 0 },
        gsm: { state: '', perc: 0, operator: '' },
        val: { screen: 0, type: '', value: '' },
        rtcm: '',
        activity: '',
        tablet: 0,
        network_usage: ``,
        throttled: '',
        updatedAt: 0,
    }

    try {

        const { data } = location
        const [_g, _g1, _g2, _gps, _gsm, _rtcm, _val] = data.split('|')
        const g = _g.split(',')
        const g1 = _g1.split(',')
        const g2 = _g2.split(',')
        const gps = _gps.split(',')
        const gsm = _gsm.split(',')
        const [rtcm, activity, tablet] = _rtcm.split(',')
        const val = _val.split(',')

        e.g1.isrtk = g1[0]; e.g1.sats = Number(g1[1]);
        e.g2.isrtk = g2[0]; e.g2.sats = Number(g2[1]);
        e.accuracy._2d = Number(gps[0]); e.accuracy._3d = Number(gps[1]);
        e.gsm.state = gsm[0]; e.gsm.perc = Number(gsm[1]); e.gsm.operator = gsm[2];
        e.val.screen = Number(val[0] ?? 0); e.val.type = val[1], e.val.value = val[2];

        e.rtcm = rtcm
        e.activity = activity
        e.tablet = Number(tablet)

        e.gps = [Number(g[0]), Number(g[1]), 0]
        e.utm = [Number(location.east), Number(location.north), Number(location.elevation)]
        e.head = Number(location.heading)
        e.speed = Number(location.speed)

        e.project = location.proj
        e.type = location.type
        e.name = location.name
        e.throttled = gsm[5]
        e.network_usage = `RX: ${gsm[3]} kbps TX: ${gsm[4]} kbps`
        e.updatedAt = moment(location.updatedAt).valueOf()

        return e

    } catch (err) { return e }

}