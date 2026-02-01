import { React, Row, Col, notification, message } from 'uweb'
import styled, { createGlobalStyle } from 'styled-components'
import { AsyncWait, Safe } from 'utils/web'
import { LoadRequiredFiles } from 'uweb/utils'

import { mapHook } from './hooks/map'
import { Vehicles } from './hooks/vehicle'
import { parseLocation } from './hooks/helper'

const Style = createGlobalStyle`

    #main {
        -webkit-touch-callout: none; /* iOS Safari */
        -webkit-user-select: none; /* Safari */
        -khtml-user-select: none; /* Konqueror HTML */
        -moz-user-select: none; /* Firefox */
        -ms-user-select: none; /* Internet Explorer/Edge */
        user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
    }

    .ant-notification-notice-description {
        margin-inline-start: 0px !important;
    }

    .maptalks-attribution {
        display: none;
    }

`

const Layers = styled.div``

const { useEffect, useState } = React

export default (cfg: iArgs) => {

    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode: cfg.isDarkMode, conf: {} })
    const [notifApi, contextHolderNotification] = notification.useNotification()
    const [messageApi, contextHolderMessage] = message.useMessage()

    const [paneLoaded, setPaneLoaded] = useState(false)

    useEffect(() => {

        cfg.event.on('message', ({ type, message }) => messageApi.open({ type, content: message }))

        Safe(async () => {

            const { Pane } = await import('tweakpane')
            cfg.Pane = new Pane({ title: 'Settings' })
            cfg.Pane.addBinding(
                { Vehicle: 'All' }, 'Vehicle',
                { options: { All: 'All', Other: 'Other' } }
            )
            setPaneLoaded(true)

        })

    }, [])

    useEffect(() => {

        if (!isMapReady) { return }

        // cfg.core_collect.pull('get-locations-by-date', { name: 'SV102', start: '2026-01-20 10:00', end: '2026-01-20 11:00' }, (err: any, res: any) => {
        cfg.core_collect.pull('get-locations-by-date', { name: 'SV102', start: '2026-01-25 00:00', end: '2026-01-26 00:00' }, (err: any, res: any) => {

            console.log(res)
            const points: any = []
            let minElev = 99999, maxElev = -99999, top = 0
            let i = 0

            for (const x of res) {
                const { east, north, elevation, data, updatedAt } = x
                if (elevation < minElev) minElev = elevation
                if (elevation > maxElev) maxElev = elevation
            }

            top = maxElev - minElev

            for (const x of res) {

                const { east, north, elevation, data, updatedAt } = x
                // 105.501397,43.669155|rtk,32|rtk,32|1.1,1.3|success,28.250000000000004,Point-to-Point Protocol,undefined,undefined,undefined|success,moving [←←],1|2,CUT ↓,0.56
                const _ = data.split('|')
                const [xlng, ylat] = _[0].split(',')
                const coordinate: any = [Number(xlng), Number(ylat)]
                const [scr, dir, dis] = _[6].split(',')
                const h = elevation - minElev

                // if (dis !== '-') console.log(`${scr} ${dir} ${dis}`)

                points.push({ coordinate, height: h, value: ++i, color: dis !== '-' ? 'white' : 'green', size: 2 })

            }

            // const point: any = Maptalks.threeLayer.toPoints(points, {}, coloredMaterial())
            // Maptalks.threeLayer.addMesh(point)
            // const point = threeLayer.toPoint(lnglat, { height: 100 * Math.random() }, material);

        })

        Safe(() => { }, 'Setup_Tools')

        /** Waiting for the GLTF or OBJ files to finish downloading before fetching the actual location data **/
        LoadRequiredFiles(async () => {

            const vcs = new Vehicles(Maptalks)
            const dms = 100

            /** Fetching the most recent active locations of the vehicles **/
            cfg.core_collect.get("get-enums", { type: 'location.now' }).then(async (ls: any) => {

                for (const location of ls) {

                    const parsed = JSON.parse(location.value)
                    const obj = parseLocation(parsed)

                    if (obj.project && obj.type && obj.name) {

                        await AsyncWait(dms)
                        const key = `${obj.project}.${obj.type}.${obj.name}`
                        vcs.live_update(obj)

                        /** Subscribing to a vehicle via WebSocket to receive live data updates **/
                        cfg.core_collect.on(key, (loc) => vcs.live_update(parseLocation(loc)))

                    }

                }

            }).catch(console.error)

        })

    }, [isMapReady])

    return <Row id="main" style={{ /* filter: 'sepia(1)', */ height: '100%' }}>

        <Style />

        {contextHolderNotification}
        {contextHolderMessage}

        <Col id='render_0' span={24} style={{ height: '100%' }} />

        <Layers></Layers>

    </Row>

}