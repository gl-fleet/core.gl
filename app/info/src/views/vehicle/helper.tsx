import { React, Button } from 'uweb'
import { Vehicle, Toyota, Drill, Dozer } from 'uweb/utils'
import { MapView } from 'uweb/maptalks'
import { Loop, log, moment, oget } from 'utils/web'

import { createGlobalStyle } from 'styled-components'
import { CloudSyncOutlined } from '@ant-design/icons'

const { useEffect, useState, useRef } = React

export const Style = createGlobalStyle`
    html, body {
        background: ${({ color }: any) => color};
    }
    #stream_view {
        filter: ${({ filter }: any) => filter};
    } 
    .maptalks-attribution {
        display: none;
    }
    .ant-tabs-nav-wrap {
        padding: 0px 16px;
    }
`

export const getVehicle = (Maptalks: MapView, type: string): Promise<Vehicle> => new Promise((resolve, reject) => {

    log.info(`[Vehicles] -> Get Vehicle / ${type}`)

    type === 'vehicle' && Toyota({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks, fps: 10 })))
        .catch((err) => reject(err))

    type === 'drill' && Drill({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks, fps: 10 })))
        .catch((err) => reject(err))

    type === 'dozer' && Dozer({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks, fps: 10 })))
        .catch((err) => reject(err))

})

export const UpdateStatus = ({ data }: any) => {

    const [danger, setDanger] = useState(0)
    const last = useRef(0)
    last.current = oget(0)(data, 'updatedAt')

    useEffect(() => {

        Loop(() => {

            const delay = Date.now() - last.current
            setDanger(delay > 30000 ? 1 : delay >= 15000 ? 0.5 : 0)

        }, 1000)

    }, [])

    if (last.current === 0) return <Button danger={danger !== 0} disabled={true} type='dashed' icon={<CloudSyncOutlined />}>
        <Style filter={`grayscale(${danger})`} />
        {'...'}
    </Button>
    else return <Button danger={danger !== 0} ghost disabled={false} type='primary' icon={<CloudSyncOutlined />}>
        <Style filter={`grayscale(${danger})`} />
        {moment(last.current).format('HH:mm:ss.SSS')}
    </Button>

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