import { React, Row, Col } from 'uweb'
import { AsyncWait, Safe } from 'utils/web'
import styled from 'styled-components'

import { Avatar, Button, Dropdown, Space, Tooltip, Input } from 'uweb'

import {
    CarOutlined,
    EnvironmentOutlined,
    GatewayOutlined,
    AlertOutlined,
    ToolOutlined,
    BarChartOutlined,
    SettingOutlined,
    UserOutlined,
    ExpandOutlined,

    ColumnWidthOutlined,
    RadiusSettingOutlined,
} from '@ant-design/icons'

import { BulbOutlined, BulbFilled } from '@ant-design/icons'

const { useState, useEffect } = React

const Header = styled.div`
    position: fixed;
    height: 32px;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 99;
    .ant-input-group-wrapper {
        align-content: center;
    }
`

export default (cfg: iArgs) => {

    const [status, setStatus]: any = useState('-')

    useEffect(() => {

        const map = cfg.MapView?.map ?? {}

        const getStatus = () => {

            var center = map.getCenter()
            const stat = `${map.getProjection().code} ${center.x.toFixed(5)} ${center.y.toFixed(5)} ${map.getZoom().toFixed(1)}`
            setStatus(stat)

        }

        map.on('zoomend moving moveend', getStatus)
        getStatus()

    }, [])

    return <Header style={{ background: cfg.isDarkMode ? '#37383d' : '#e5e5e5', textAlign: 'center', overflowX: 'auto' }}>

        <Space align='center'>

            <Tooltip title="Area">
                <Button type='text' icon={<RadiusSettingOutlined />} onClick={() => cfg.event.emit('tool.area.enable')} />
            </Tooltip>

            <Tooltip title="Distance">
                <Button type='text' icon={<ColumnWidthOutlined />} onClick={() => cfg.event.emit('tool.distance.enable')} />
            </Tooltip>

            <Button disabled type='text'>{status}</Button>

        </Space>

    </Header>

}