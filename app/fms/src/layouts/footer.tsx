import { React, Row, Col, Typography } from 'uweb'
import { UTM } from 'uweb/utils'
import { AsyncWait, Safe } from 'utils/web'
import styled from 'styled-components'
import { getUTMZone } from '../hooks/utils'

import { Avatar, Button, Dropdown, Space, Tooltip, Input } from 'uweb'
import { ColumnWidthOutlined, RadiusSettingOutlined } from '@ant-design/icons'
const { Paragraph, Text } = Typography

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
            const lon = center.x
            const lat = center.y

            const { Easting, Northing, ZoneLetter, ZoneNumber } = UTM.convertLatLngToUtm(lat, lon, 2)

            const stat = `${Easting} ${Northing} ${ZoneNumber}${ZoneLetter}`
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

            <Paragraph code copyable style={{ margin: 0, paddingTop: 2 }}>{status}</Paragraph>

        </Space>

    </Header>

}