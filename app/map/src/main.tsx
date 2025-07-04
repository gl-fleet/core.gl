import { React, Row, Col, notification, message } from 'uweb'
import { createGlobalStyle } from 'styled-components'
import { AsyncWait, Safe } from 'utils/web'
import { LoadRequiredFiles } from 'uweb/utils'

import { mapHook } from './hooks/map'
import { Vehicles } from './hooks/vehicle'
import { parseLocation } from './hooks/helper'

import { DistanceTool } from './tools/distance'
import { AreaTool } from './tools/area'
import { GeometryTool } from './tools/geometry'

import Menu from './views/menu'
import Auth from './views/auth'
import Fatigue from './views/fatigue'
import Search from './views/search'

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

`

const { useEffect } = React

export default (cfg: iArgs) => {

    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode: cfg.isDarkMode, conf: {} })
    const [notifApi, contextHolderNotification] = notification.useNotification()
    const [messageApi, contextHolderMessage] = message.useMessage()

    useEffect(() => { cfg.event.on('message', ({ type, message }) => messageApi.open({ type, content: message })) }, [])

    useEffect(() => {

        if (!isMapReady) { return }

        Safe(() => {

            new DistanceTool(Maptalks, cfg, messageApi)
            new AreaTool(Maptalks, cfg, messageApi)
            new GeometryTool(Maptalks, cfg, messageApi, notifApi)

        }, 'Setup_Tools')

        /** Waiting for the GLTF or OBJ files to finish downloading before fetching the actual location data **/
        LoadRequiredFiles(async () => {

            const vcs = new Vehicles(Maptalks)
            const dms = 100

            /** Rendering vehicles to evaluate performance impact **/
            setInterval(async () => {

                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'drill', name: 'DR001', activity: 'Idle', gps: [105.49508346330428 + 0.0235, 43.67338010130343, 0] })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'drill', name: 'DR002', activity: 'Idle', gps: [105.49508346330428 + 0.0240, 43.67338010130343, 0] })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'drill', name: 'DR003', activity: 'Idle', gps: [105.49508346330428 + 0.0245, 43.67338010130343, 0] })

                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'dozer', name: 'DZ001', activity: 'Idle', gps: [105.49508346330428 + 0.0250, 43.67338010130343, 0] })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'dozer', name: 'DZ002', activity: 'Idle', gps: [105.49508346330428 + 0.0255, 43.67338010130343, 0] })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'dozer', name: 'DZ003', activity: 'Idle', gps: [105.49508346330428 + 0.0260, 43.67338010130343, 0] })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'truck', name: 'TR001', activity: 'Idle', gps: [105.49508346330428 + 0.0265, 43.67338010130343, 0] })

                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'exca', name: 'EX001', activity: 'Idle', gps: [105.49508346330428 + 0.0235, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'exca', name: 'EX002', activity: 'Idle', gps: [105.49508346330428 + 0.0240, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'exca', name: 'EX003', activity: 'Idle', gps: [105.49508346330428 + 0.0245, 43.67338010130343 - 0.0005, 0], head: Math.PI })

                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'dump', name: 'DT001', activity: 'Idle', gps: [105.49508346330428 + 0.0250, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'dump', name: 'DT002', activity: 'Idle', gps: [105.49508346330428 + 0.0255, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'dump', name: 'DT003', activity: 'Idle', gps: [105.49508346330428 + 0.0260, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(dms) && vcs.live_update({ project: 'Demo', type: 'truck', name: 'TR002', activity: 'Idle', gps: [105.49508346330428 + 0.0265, 43.67338010130343 - 0.0005, 0], head: Math.PI })

            }, 1000)

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

        <Auth {...cfg} />
        <Menu {...cfg} />
        {/* <Fatigue {...cfg} /> */}
        <Search {...cfg} Maptalks={Maptalks} />

        <Col id='render_0' span={24} style={{ height: '100%' }} />

    </Row>

}