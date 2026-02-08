import { React, Row, Col, notification, message } from 'uweb'
import styled, { createGlobalStyle } from 'styled-components'
import { LoadRequiredFiles } from 'uweb/utils'
import { Safe } from 'utils/web'

import { mapHook } from './hooks/map'

import LayoutHeader from './layouts/header'
import LayoutFooter from './layouts/footer'
import LayoutMenu from './layouts/menu'

import { DistanceTool } from './tools/distance'
import { AreaTool } from './tools/area'

import LayerControllers from './layers/controllers'
import LayerVehicles from './layers/vehicles'
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

    .ant-message {
        top: auto !important;
        bottom: 36px;
    }

    .ant-message-notice-content {
        background: ${({ dark = true }) => dark ? '#37383d' : '#e5e5e5'} !important;
        box-shadow: none !important;
    }

    .ant-message-notice-content {
        padding: 4px 12px !important;
    }

    .tp-fldv_t {
        padding-left: 7px !important;
        font-weight: 800;
    }
    .tp-rotv {
        box-shadow: none !important;
    }

    :root {
        --tp-base-background-color: ${({ dark = true }) => dark ? 'rgb(55, 56, 61)' : '#e5e5e5'};
        --tp-base-border-radius: 0px;
        --tp-input-background-color: ${({ dark = true }) => dark ? 'hsla(0, 0%, 0%, 0.3)' : 'hsla(0, 0%, 0%, 0.5)'};
        --tp-label-foreground-color: ${({ dark = true }) => dark ? 'hsla(0, 0%, 100%, 0.5)' : '#000'};
        --tp-container-foreground-color: ${({ dark = true }) => dark ? '#fff' : '#000'};
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

            Safe(() => {

                new DistanceTool(Maptalks, cfg, messageApi)
                new AreaTool(Maptalks, cfg, messageApi)

            }, 'Setup_Tools')

        }

    }, [isMapReady])

    cfg = { ...cfg, ...props.current }

    return <Row id="main" style={{ height: '100%' }}>

        <GlobalStyle dark={cfg.isDarkMode} />

        {loaded === 0 && <LayoutHeader {...cfg} />}

        <LayoutMenu {...cfg} />
        <Pane id="pane" />
        <Col id='render_0' span={24} style={{ height: '100%' }} />

        {loaded === 0 && <LayoutFooter {...cfg} />}

        <Layers>
            {loaded === 0 && <LayerControllers {...cfg} />}
            {loaded === 0 && <LayerVehicles {...cfg} />}
            {loaded === 0 && <LayerLocations {...cfg} />}
            {loaded === 0 && <LayerGeofences {...cfg} />}
        </Layers>

        {contextHolderNotification}
        {contextHolderMessage}

    </Row>

}