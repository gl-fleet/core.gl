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

            const locations = async (ls: any) => {

                for (const location of ls) {

                    await AsyncWait(250)
                    const obj = parseLocation(location)

                    if (obj.project && obj.type && obj.name) {

                        const key = `${obj.project}.${obj.type}.${obj.name}`

                        event.emit('location-initial', obj)
                        vcs.live_update(obj)

                        cfg.core_collect.on(key, (loc) => {

                            event.emit('location-update', loc)
                            vcs.live_update(parseLocation(loc))

                        })

                    }

                }

            }

            // window.addEventListener("focus", () => {
            cfg.core_collect.get('get-locations-all-last-v2', {}).then(locations).catch(console.error)
            // })

        })

    }, [isMapReady])

    return <Row id="main" style={{ /* filter: 'sepia(1)', */ height: '100%' }}>

        <Style />

        {contextHolderMessage}
        {contextHolderNotification}

        <Auth {...cfg} />
        <Menu {...cfg} />
        <Fatigue {...cfg} />
        <Search {...cfg} MapView={Maptalks} />

        <Col id='render_0' span={24} style={{ height: '100%' }} />

    </Row>

}