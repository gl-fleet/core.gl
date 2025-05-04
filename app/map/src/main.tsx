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

    const { isDarkMode, event } = cfg
    const [messageApi, contextHolderMessage] = message.useMessage()
    const [notifApi, contextHolderNotification] = notification.useNotification()
    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode, conf: {} })

    useEffect(() => {

        event.on('message', ({ type, message }) => messageApi.open({ type, content: message }))

    }, [])

    useEffect(() => {

        if (!isMapReady) { return }

        Safe(() => {

            new DistanceTool(Maptalks, cfg, messageApi)
            new AreaTool(Maptalks, cfg, messageApi)
            new GeometryTool(Maptalks, cfg, messageApi, notifApi)

        }, 'Setup_Tools')

        LoadRequiredFiles(async () => {

            const vcs = new Vehicles(Maptalks)

            setInterval(async () => {

                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'drill', name: 'DR001', activity: 'Idle', gps: [105.49508346330428 + 0.0235, 43.67338010130343, 0] })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'drill', name: 'DR002', activity: 'Idle', gps: [105.49508346330428 + 0.0240, 43.67338010130343, 0] })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'drill', name: 'DR003', activity: 'Idle', gps: [105.49508346330428 + 0.0245, 43.67338010130343, 0] })

                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'dozer', name: 'DZ001', activity: 'Idle', gps: [105.49508346330428 + 0.0250, 43.67338010130343, 0] })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'dozer', name: 'DZ002', activity: 'Idle', gps: [105.49508346330428 + 0.0255, 43.67338010130343, 0] })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'dozer', name: 'DZ003', activity: 'Idle', gps: [105.49508346330428 + 0.0260, 43.67338010130343, 0] })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'truck', name: 'TR001', activity: 'Idle', gps: [105.49508346330428 + 0.0265, 43.67338010130343, 0] })

                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'exca', name: 'EX001', activity: 'Idle', gps: [105.49508346330428 + 0.0235, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'exca', name: 'EX002', activity: 'Idle', gps: [105.49508346330428 + 0.0240, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'exca', name: 'EX003', activity: 'Idle', gps: [105.49508346330428 + 0.0245, 43.67338010130343 - 0.0005, 0], head: Math.PI })

                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'dump', name: 'DT001', activity: 'Idle', gps: [105.49508346330428 + 0.0250, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'dump', name: 'DT002', activity: 'Idle', gps: [105.49508346330428 + 0.0255, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'dump', name: 'DT003', activity: 'Idle', gps: [105.49508346330428 + 0.0260, 43.67338010130343 - 0.0005, 0], head: Math.PI })
                await AsyncWait(250) && vcs.live_update({ project: 'Demo', type: 'truck', name: 'TR002', activity: 'Idle', gps: [105.49508346330428 + 0.0265, 43.67338010130343 - 0.0005, 0], head: Math.PI })

            }, 2500)

            const locations = async (ls: any) => {

                for (const location of ls) {

                    await AsyncWait(250)
                    const parsed = JSON.parse(location.value)
                    const obj = parseLocation(parsed)

                    if (obj.project && obj.type && obj.name) {

                        const key = `${obj.project}.${obj.type}.${obj.name}`

                        vcs.live_update(obj)

                        cfg.core_collect.on(key, (loc) => {

                            vcs.live_update(parseLocation(loc))

                        })

                    }

                }

            }

            cfg.core_collect.get("get-enums", { type: 'location.now' }).then(locations).catch(console.error)

        })

    }, [isMapReady])

    return <Row id="main" style={{ /* filter: 'sepia(1)', */ height: '100%' }}>

        <Style />

        {contextHolderMessage}
        {contextHolderNotification}

        <Auth {...cfg} />
        <Menu {...cfg} />
        <Fatigue {...cfg} />
        <Search {...cfg} Maptalks={Maptalks} />

        <Col id='render_0' span={24} style={{ height: '100%' }} />

    </Row>

}