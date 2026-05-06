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
} from '@ant-design/icons'

import { BulbOutlined, BulbFilled } from '@ant-design/icons'

import Search from '../components/search'
import Auth from '../components/auth'

const Header = styled.div`
    position: fixed;
    height: 32px;
    top: 0;
    left: 0;
    right: 0;
    z-index: 99;
    .ant-input-group-wrapper {
        align-content: center;
    }
`

export default (cfg: iArgs) => {

    const items: any = [
        {
            key: 'LineString',
            label: 'LineString',
            onClick: () => cfg.event.emit('layer.geofences', { title: 'Create LineString', value: 'LineString' })
        },
        {
            key: 'Polygon',
            label: 'Polygon',
            onClick: () => cfg.event.emit('layer.geofences', { title: 'Create Polygon', value: 'Polygon' })
        },
        {
            key: 'Circle',
            label: 'Circle',
            onClick: () => cfg.event.emit('layer.geofences', { title: 'Create Circle', value: 'Circle' })
        },
        {
            key: 'Rectangle',
            label: 'Rectangle',
            onClick: () => cfg.event.emit('layer.geofences', { title: 'Create Rectangle', value: 'Rectangle' })
        },
    ]

    return <Header style={{ background: cfg.isDarkMode ? '#282828' : '#e5e5e5', textAlign: 'center', overflowX: 'auto' }}>

        <Space align='center'>

            <Avatar src="favicon.ico" size={'small'} shape='square' />

            <Tooltip title="Locations">
                <Button type='text' icon={<EnvironmentOutlined />} onClick={() => cfg.event.emit('layer.locations', 'Location history')} />
            </Tooltip>

            <Dropdown menu={{ items }} placement="bottom">
                <Button type='text' icon={<GatewayOutlined />} />
            </Dropdown>

            <Tooltip title="Alerts">
                <Button disabled type='text' icon={<AlertOutlined />} />
            </Tooltip>

            <Tooltip title="Maintenance">
                <Button disabled type='text' icon={<ToolOutlined />} />
            </Tooltip>

            <Tooltip title="Reports">
                <Button disabled type='text' icon={<BarChartOutlined />} />
            </Tooltip>

            <Search {...cfg} />

            <Tooltip title="Theme">
                <Button type='text' icon={cfg.isDarkMode ? <BulbOutlined /> : <BulbFilled />} onClick={() => cfg.setIsDarMode((v: any) => !v)} />
            </Tooltip>

            <Auth {...cfg} />

        </Space>

    </Header>

}