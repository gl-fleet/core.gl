import { React, Row, Col, Typography, Popover, InputNumber } from 'uweb'
import { UTM } from 'uweb/utils'
import styled from 'styled-components'
import { KeyValue } from 'utils/web'

import { Avatar, Button, Dropdown, Space, Tooltip, Input } from 'uweb'
import { CodepenOutlined, ColumnWidthOutlined, RadiusSettingOutlined } from '@ant-design/icons'
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
    const [_3D, set_3D]: any = useState(KeyValue('3D') === 'yes')
    const [_el, setEl]: any = useState(Number(KeyValue('Elevation') ?? 1500))

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

    useEffect(() => { KeyValue('3D', _3D === true ? 'yes' : 'no') }, [_3D])
    useEffect(() => { KeyValue('Elevation', `${_el}`) }, [_el])

    return <Header style={{ background: cfg.isDarkMode ? '#282828' : '#e5e5e5', textAlign: 'center', overflowX: 'auto' }}>

        <Space align='center'>

            <Popover content={<InputNumber disabled={!_3D} prefix={'Elevation:'} defaultValue={_el} style={{ minWidth: 140 }} size='small' onChange={(e) => { setEl(e) }} />}>
                <Button type='text' icon={<CodepenOutlined style={{ color: _3D ? '#1677ff' : 'inherit' }} />} onClick={() => {

                    cfg.event.emit('tool.3D.enable', !_3D)
                    set_3D(!_3D)

                }} />
            </Popover>

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