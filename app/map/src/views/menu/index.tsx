import { React, Layout, Menu, Modal } from 'uweb'
import { EnvironmentOutlined, ProfileOutlined, RadarChartOutlined, GatewayOutlined, HighlightOutlined } from '@ant-design/icons'
import { createGlobalStyle } from 'styled-components'

const Style = createGlobalStyle`

    .maptalks-attribution {
        display: none;
    }

    #menu {
        position: absolute;
        background: transparent;
        left: 16px;
        top: calc(50% - 110px);
        z-index: 1;
    }

    .ant-menu {
        width: 50px;
        border-radius: 8px;
    }

`

export default (cfg: iArgs) => {

    const { event } = cfg

    const items: any = [
        {
            key: 'locations',
            label: 'Locations',
            disabled: false,
            icon: <EnvironmentOutlined />,
            onClick: () => event.emit('layer.locations'),
        },
        {
            key: 'coverage',
            label: 'Coverage',
            disabled: true,
            icon: <RadarChartOutlined />,
            children: [
                { key: 'netw', label: 'Network coverage' },
                { key: 'sate', label: 'Satellite coverage' },
            ]
        },
        {
            key: 'views',
            label: 'Views',
            disabled: true,
            icon: <ProfileOutlined />,
            children: [
                { key: 'load', label: 'Loads' },
                { key: 'dump', label: 'Dumps' },
                { key: 'cycl', label: 'Cycles' },
            ]
        },
        {
            key: 'measure',
            label: 'Measure',
            icon: <GatewayOutlined />,
            children: [
                { key: 'dist', label: 'Distance measure', onClick: () => event.emit('distance.tool.enable') },
                { key: 'area', label: 'Area measure', onClick: () => event.emit('area.tool.enable') },
            ]
        },
        {
            key: 'draw',
            label: 'Draw',
            icon: <HighlightOutlined />,
            children: [
                { key: 'LineString', label: 'Path', onClick: () => event.emit('geometry.tool.enable', 'LineString') },
                { key: 'Polygon', label: 'Boundary', onClick: () => event.emit('geometry.tool.enable', 'Polygon') },
                { key: 'Circle', label: 'Circle', onClick: () => event.emit('geometry.tool.enable', 'Circle') },
                { key: 'Rectangle', label: 'Rectangle', onClick: () => event.emit('geometry.tool.enable', 'Rectangle') },
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