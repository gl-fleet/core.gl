import { React, Row, Col } from 'uweb'
import { log, Delay, Safe } from 'utils/web'
import { Point, Vehicle } from 'uweb/utils'
import { maptalks } from 'uweb/maptalks'

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

            api.on('stream', (body: any) => {

                console.log(body)
                vcs.live_update(body)

            })

        })

    }, [isMapReady])

    return <Row id="main" style={{ height: '100%' }}>
        <Menu {...cfg} />
        <Col id='render_0_' span={24} style={{ height: '100%' }} />
    </Row>

}