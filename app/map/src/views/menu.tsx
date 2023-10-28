import { React, Layout, Menu } from 'uweb'
import { AppstoreOutlined, CloudUploadOutlined } from '@ant-design/icons'
import { createGlobalStyle } from 'styled-components'

const Style = createGlobalStyle`

    .maptalks-attribution {
        display: none;
    }

    #menu {
        position: absolute;
        background: transparent;
        left: 16px;
        top: calc(50% - 80px);
        z-index: 1;
    }

    .ant-menu {
        width: 50px;
        border-radius: 8px;
    }

`

export default (cfg: iArgs) => {

    const open = (url: string) => {
        const width = screen.width
        const height = screen.height
        const popw = 720
        const poph = 640
        window.open(`/${url}`, url, `top=${(height / 2) - (poph / 2) - 24},left=${window.screenX + (width / 2) - (popw / 2)},width=${popw},height=${poph}`)
    }

    const items: any = [
        {
            key: '0',
            label: 'Applications',
            icon: <AppstoreOutlined />,
            children: [
                { key: '01', label: 'View 1' },
                { key: '02', label: 'View 2' },
                { key: '03', label: 'View 3' },
            ]
        },
        {
            key: '1',
            label: 'Uploader',
            icon: <CloudUploadOutlined />,
            children: [
                { key: '11', label: <span onClick={() => open('core_info/?view=file&type=dxf-geojson')}>DXF Uploader</span> },
                { key: '12', label: <span onClick={() => open('core_info/?view=file&type=csv-geojson')}>CSV Uploader</span> },
                { key: '13', label: <span onClick={() => open('core_info/?view=file&type=json-upload')}>JSON Uploader</span> },
            ]
        }
    ]

    return <Layout id="menu">

        <Style />

        <Menu
            mode="inline"
            inlineCollapsed={true}
            items={items}
        />

    </Layout>

}