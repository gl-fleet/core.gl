import { React, Row, Col, notification, message } from 'uweb'
import { Delay, Loop, Safe } from 'utils/web'
import { createGlobalStyle } from 'styled-components'

import { mapHook } from './hooks/map'
import { Vehicles } from './hooks/vehicle'

import { DistanceTool } from './tools/distance'
import { AreaTool } from './tools/area'
import { GeometryTool } from './tools/geometry'

import Menu from './views/menu'
import Auth from './views/auth'

const Style = createGlobalStyle`

    .ant-notification-notice-description {
        margin-inline-start: 0px !important;
    }

`

const { useEffect, useState, useRef } = React

export default (cfg: iArgs) => {

    const { isDarkMode, event, api, kv } = cfg
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

        Safe(async () => {

            const vcs = new Vehicles(Maptalks)

            api.get('vehicle-query', { project: '*' }).then((obj: any) => {

                console.log(`[vehicle-query]`, obj)

                if (typeof obj === 'object') {
                    for (const project in obj) {
                        for (const type in obj[project]) {
                            for (const name in obj[project][type]) {
                                const data = obj[project][type][name]
                                vcs.live_update(data)
                            }
                        }
                    }
                }

            }).catch((err) => {
                console.log(err)
            })

            api.on('vehicle-stream', (body: any) => {
                vcs.live_update(body)
            })

        })

    }, [isMapReady])

    return <Row id="main" style={{ /* filter: 'sepia(1)', */ height: '100%' }}>

        <Style />

        {contextHolderMessage}
        {contextHolderNotification}

        <Auth {...cfg} />
        <Menu {...cfg} />

        <Col id='render_0' span={24} style={{ height: '100%' }} />

    </Row>

}