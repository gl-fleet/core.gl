import { React, Layout, Breadcrumb, Typography } from 'uweb'

import { createGlobalStyle } from 'styled-components'

import RTCM from './rtcm'

const { useEffect, useState, useRef } = React
const { Text, Link } = Typography

const Style = createGlobalStyle`
    #menu {
        position: absolute;
        background: transparent;
        width: 100%;
        top: 16px; 
        z-index: 1;
    }
    #menu > nav {
        font-weight: 800;
        max-width: 780px;
        margin: auto;
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid #e5e5e5;
    }
    #menu a {
        color: #1677ff;
    }
    #menu span {
        color: #1677ff;
        cursor: pointer;
    }
    .maptalks-attribution {
        display: none;
    }
`

export default (cfg: iArgs) => {

    const { isDarkMode, event } = cfg

    const open = (url: string) => {
        const width = screen.width
        const height = screen.height
        const popw = 700
        const poph = 640
        window.open(`/${url}`, url, `top=${(height / 2) - (poph / 2) - 24},left=${window.screenX + (width / 2) - (popw / 2)},width=${popw},height=${poph}`)
    }

    useEffect(() => { }, [])

    return <Layout id="menu">
        <Style />
        <Breadcrumb
            style={{ background: isDarkMode ? '#000' : '#fff' }}
            items={[
                {
                    title: <Text onClick={() => open('map')}>Map</Text>
                },
                {
                    title: <RTCM {...cfg} />
                },
                {
                    title: <Text>File</Text>,
                    menu: {
                        items: [
                            { key: '01', label: <Text onClick={() => open('core_file/?type=dxf-geojson')}>DXF Uploader</Text> },
                            { key: '02', label: <Text onClick={() => open('core_file/?type=csv-geojson')}>CSV Uploader</Text> },
                            { key: '03', label: <Text onClick={() => open('core_file/?type=json-upload')}>JSON Uploader</Text> },
                        ]
                    }
                },
            ]}
        />
    </Layout>

}