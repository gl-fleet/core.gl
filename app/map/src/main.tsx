import { React, Row, Col } from 'uweb'
import { log, Delay, Safe } from 'utils/web'
import { Point } from 'uweb/utils'

import { mapHook } from './hooks/map'
import Menu from './views/menu'

const { useEffect, useState, useRef } = React

export default (cfg: iArgs) => {

    const { isDarkMode, event } = cfg
    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode, conf: {} })

    useEffect(() => {

    }, [])

    return <Row id="main" style={{ height: '100%' }}>
        <Menu {...cfg} />
        <Col id='render_0' span={24} style={{ height: '100%' }} />
    </Row>

}