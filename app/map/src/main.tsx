import { React, Row, Col } from 'uweb'
import { log, Delay, Safe } from 'utils/web'
import { mapHook } from './hooks/map'
import { Vehicles } from './hooks/vehicle'
import Menu from './views/menu'

const { useEffect, useState, useRef } = React

export default (cfg: iArgs) => {

    const { isDarkMode, event, api } = cfg
    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode, conf: {} })

    useEffect(() => {

        isMapReady && Safe(async () => {

            const vcs = new Vehicles(Maptalks)

            api.get('vehicle-query', { project: '*' }).then((obj: any) => {

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
                console.log(obj)

            }).catch((err) => {
                console.log(err)
            })

            api.on('vehicle-stream', (body: any) => {
                vcs.live_update(body)
            })

        })

    }, [isMapReady])

    return <Row id="main" style={{ height: '100%' }}>
        <Menu {...cfg} />
        <Col id='render_0' span={24} style={{ height: '100%' }} />
    </Row>

}