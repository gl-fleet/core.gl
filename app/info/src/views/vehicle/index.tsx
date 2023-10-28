import { React, Layout, Tabs, Row, Col, Typography } from 'uweb'
import { MapView } from 'uweb/maptalks'
import { Vehicle } from 'uweb/utils'
import { Loop, moment, dateFormat, oget, log } from 'utils/web'
import { FolderOpenOutlined, ApartmentOutlined, WindowsOutlined } from '@ant-design/icons'
import ReactJson from 'react-json-view'

import { Style, getVehicle } from './helper'
import StreamView from './stream'

const { useEffect, useState, useRef } = React
const { Title, Text } = Typography

export default (cfg: iArgs) => {

    const [stream, setStream] = useState<any>({ loading: true, err: "", data: {} })
    const [tunnel, setTunnel] = useState<any>({ loading: true, err: "", data: {} })
    const [lastUpdate, setLastUpdate] = useState<number>(0)

    useEffect(() => {

        const params = (new URL(document.location.toString())).searchParams
        const project = params.get('project')
        const type = params.get('type')
        const name = params.get('name')

        log.info(`[FILE] -> Query / ${name}`)

        let vehicle: Vehicle

        const map = new MapView({
            containerId: 'render_vhc',
            zoom: 20,
            isDarkMode: cfg.isDarkMode,
            urlTemplate: `https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png`,
            stats: null,
        })

        map.onReady(() => {
            getVehicle(map, type ?? "").then((VHC) => { vehicle = VHC })
        })

        const update = (obj: any) => {

            setStream({ loading: false, err: "", data: obj })
            const { data_gps } = obj
            const { gps } = data_gps
            map.map && map.map.setCenter(gps)
            vehicle && vehicle.update(data_gps)

        }

        cfg.api.get('vehicle-query', { project, type, name })
            .then((obj: any) => update(obj))
            .catch((e) => setStream({ loading: false, err: e.message, data: {} }))

        cfg.api.get('vehicle-tunnel', { project, type, name }).then((obj: any) => {

            setTunnel({ loading: false, err: "", data: obj })

        }).catch((e) => setTunnel({ loading: false, err: e.message, data: {} }))

        cfg.api.on(name, (obj: any) => update(obj))

    }, [])

    console.log('stream', stream)
    console.log('tunnel', tunnel)

    const updated = oget('***')(stream.data, 'last')

    return <Layout style={{ padding: 16 }}>
        <Row gutter={[16, 16]} id="main">

            <Style />

            <Col span={24} style={{ position: 'relative' }}>
                <Title level={4} style={{ position: 'absolute', top: 16, left: 38, zIndex: 100, margin: 0 }}>{stream.data.project} / {stream.data.name}</Title>
                <Title level={4} style={{ position: 'absolute', top: 16, right: 38, zIndex: 100, margin: 0, textTransform: 'capitalize' }}>{oget('***')(stream.data, 'data_activity', 'state')}</Title>
                <div style={{ position: 'absolute', bottom: 16, right: 38, zIndex: 100, margin: 0, textTransform: 'capitalize' }}>
                    {oget(["Tablet turned off"])(stream, 'inj_clients')[0]}
                    <br />
                    {moment(updated).format(dateFormat)}
                </div>
                <StreamView {...stream} />
                <div id='render_vhc' style={{ position: 'relative', height: 256, borderRadius: 8, overflow: 'hidden' }}></div>
            </Col>

            <Col span={24}>
                <Tabs
                    defaultActiveKey="1"
                    items={[
                        {
                            label: <span><FolderOpenOutlined /> Files</span>,
                            key: '1',
                            children: 'value'
                        },
                        {
                            label: <span><ApartmentOutlined /> Status</span>,
                            key: '2',
                            children: <div>
                                <ReactJson src={stream} />
                            </div>
                        },
                        {
                            label: <span><WindowsOutlined /> Hub</span>,
                            key: '3',
                            children: <div>
                                <ReactJson src={tunnel} />
                            </div>
                        }
                    ]}
                />
            </Col>

        </Row>
    </Layout >

}