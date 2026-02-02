import { React, Row, Col, notification, message } from 'uweb'
import styled, { createGlobalStyle } from 'styled-components'
import { LoadRequiredFiles } from 'uweb/utils'
import { Safe } from 'utils/web'

import { mapHook } from './hooks/map'

import LayoutHeader from './layouts/header'
import LayoutMenu from './layouts/menu'

import LayerVehicle from './layers/vehicles'
import LayerLocations from './layers/locations'
import LayerGeofences from './layers/geofences'

const GlobalStyle = createGlobalStyle`

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
const Pane = styled.div`
    position: fixed;
    right: 8;
    top: 40;
    z-index: 99;
`
const Layers = styled.div``

const { useEffect, useState, useRef } = React

export default (cfg: iArgs) => {

    const [isMapReady, Maptalks] = mapHook({ containerId: 'render_0', isDarkMode: cfg.isDarkMode, conf: {} })
    const [notifApi, contextHolderNotification] = notification.useNotification()
    const [messageApi, contextHolderMessage] = message.useMessage()
    const [loaded, setLoaded] = useState(2)

    const props: any = useRef({})

    useEffect(() => {

        Safe(async () => {

            const { Pane } = await import('tweakpane')
            props.current.Pane = new Pane({ container: document.getElementById('pane') || undefined })
            setLoaded((v) => v - 1)

        })

    }, [])

    useEffect(() => {

        props.current.notifApi = notifApi
        props.current.messageApi = messageApi

        if (isMapReady) {
            props.current.MapView = Maptalks
            LoadRequiredFiles(() => setLoaded((v) => v - 1))
        }

    }, [isMapReady])

    cfg = { ...cfg, ...props.current }

    return <Row id="main" style={{ height: '100%' }}>

        <GlobalStyle />

        {loaded === 0 && <LayoutHeader {...cfg} />}
        <LayoutMenu {...cfg} />
        <Pane id="pane" />

        <Col id='render_0' span={24} style={{ height: '100%' }} />

        <Layers>
            {loaded === 0 && <LayerVehicle {...cfg} />}
            {loaded === 0 && <LayerLocations {...cfg} />}
            {loaded === 0 && <LayerGeofences {...cfg} />}
        </Layers>

        {contextHolderNotification}
        {contextHolderMessage}

    </Row>

}