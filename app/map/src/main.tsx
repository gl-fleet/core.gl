import { React, Row, Col, message } from 'uweb'
import { log, Delay, Safe } from 'utils/web'
import { mapHook } from './hooks/map'
import { Vehicles } from './hooks/vehicle'
import Menu from './views/menu'
import Auth from './views/auth'

const { useEffect, useState, useRef } = React

export default (cfg: iArgs) => {

    const { isDarkMode, event, api, kv } = cfg
    const [messageApi, contextHolder] = message.useMessage()
    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode, conf: {} })

    useEffect(() => {

        event.on('message', ({ type, message }) => messageApi.open({ type, content: message }))

    }, [])

    useEffect(() => {

        isMapReady && Safe(async () => {

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

    return <Row id="main" style={{ height: '100%' }}>

        {contextHolder}
        <Auth {...cfg} />
        <Menu {...cfg} />
        <Col id='render_0' span={24} style={{ height: '100%' }} />

    </Row>

}