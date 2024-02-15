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
import Fatigue from './views/fatigue'

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

            api.get('vehicle-query', {}).then((ls: any) => {

                console.log(`[vehicle-query]`, ls)

                Array.isArray(ls) && ls.map((obj) => {

                    cfg.api.on(obj.project, (update: any) => vcs.live_update(update))

                    obj.equipments.map((item: any) => {
                        vcs.live_update(item)
                    })

                })

            }).catch((err) => console.log(err))

        })

    }, [isMapReady])

    return <Row id="main" style={{ /* filter: 'sepia(1)', */ height: '100%' }}>

        <Style />

        {contextHolderMessage}
        {contextHolderNotification}

        <Auth {...cfg} />
        <Fatigue {...cfg} />
        <Menu {...cfg} />

        <Col id='render_0' span={24} style={{ height: '100%' }} />

    </Row>

}