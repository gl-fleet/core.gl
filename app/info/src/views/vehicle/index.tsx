import { React, Layout, Tabs, Row, Col, Space, Typography, Button, Tooltip, Slider } from 'uweb'
import { MapView } from 'uweb/maptalks'
import { Vehicle } from 'uweb/utils'
import { oget, log } from 'utils/web'
import { FolderOpenOutlined, SwapOutlined, AndroidOutlined, DesktopOutlined, CodeOutlined } from '@ant-design/icons'
import ReactJson from 'react-json-view'

import { Style, getVehicle, UpdateStatus } from './helper'
import StreamView from './stream'
import Files from './files'

const { useEffect, useState, useRef } = React
const { Title, Text } = Typography

const marks: any = {
    0: '0°C',
    26: '26°C',
    37: '37°C',
    100: {
        style: {
            color: '#f50',
        },
        label: <strong>100°C</strong>,
    },
}

export default (cfg: iArgs) => {

    const [stream, setStream] = useState<any>({ loading: true, err: "", data: {} })
    const [tunnel, setTunnel] = useState<any>({ loading: true, err: "", data: {} })

    useEffect(() => {

        const params = (new URL(document.location.toString())).searchParams
        const project = params.get('project')
        const type = params.get('type')
        const name = params.get('name')
        let vehicle: Vehicle

        const map = new MapView({
            containerId: 'render_vhc',
            zoom: 19.5,
            devicePixelRatio: 1,
            isDarkMode: cfg.isDarkMode,
            urlTemplate: `https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png`,
            stats: null,
        })

        map.onReady(() => {
            getVehicle(map, type ?? "").then((VHC) => {

                vehicle = VHC

                const update = (obj: any) => {

                    setStream({ loading: false, err: "", data: obj })
                    const { data_gps } = obj
                    const { gps } = data_gps
                    map.map && map.map.setCenter(gps)
                    vehicle && vehicle.update(data_gps)

                }

                cfg.api.get('vehicle-query', { name, type }).then((ls: any) => {

                    if (name) cfg.api.on(name, (obj: any) => update(obj))

                    Array.isArray(ls) && ls.map((obj) => {

                        obj.equipments.map((item: any) => {
                            update(item)
                        })

                    })

                }).catch((e) => {

                    console.log(e)
                    setStream({ loading: false, err: e.message, data: {} })

                })

                cfg.api.get('vehicle-tunnel', { project, type, name }).then((obj: any) => {

                    setTunnel({ loading: false, err: "", data: obj })

                }).catch((e) => setTunnel({ loading: false, err: e.message, data: {} }))

            })
        })

    }, [])

    const tablet = oget([undefined])(stream, 'data', 'inj_clients')[0] === undefined ? false : true

    return <Layout style={{ padding: 16 }}>
        <Row gutter={[16, 16]} id="main">

            <Style color={cfg.isDarkMode ? '#000' : '#f5f5f5'} />

            <Col id="stream_view" span={24} style={{ position: 'relative' }}>
                <Title level={4} style={{ position: 'absolute', top: 16, left: 24, zIndex: 100, margin: 0 }}>{stream.data.project} / {stream.data.name}</Title>
                <Title level={4} style={{ position: 'absolute', top: 16, right: 24, zIndex: 100, margin: 0, textTransform: 'capitalize' }}>{oget('***')(stream.data, 'data_activity', 'state')}</Title>
                <div style={{ position: 'absolute', bottom: 16, right: 24, zIndex: 100, margin: 0, textTransform: 'capitalize' }}>
                    <Space wrap>
                        <Tooltip title={tablet ? 'VNC: Tablet connected' : 'VNC: Tablet disconnected!'}>
                            <Button danger={!tablet} type="primary" ghost icon={<DesktopOutlined />} />
                        </Tooltip>
                        <UpdateStatus data={stream.data} />
                    </Space>
                </div>
                <StreamView {...stream} />
                <div id='render_vhc' style={{ boxShadow: '0px 0px 2px rgba(0,0,0,0.25)', position: 'relative', height: 198, width: '100%', borderRadius: 8, overflow: 'hidden' }}></div>
            </Col>

            <Col span={24} style={{ overflowX: 'hidden' }}>
                <Tabs
                    style={{ borderRadius: 8, padding: 1, background: cfg.isDarkMode ? '#141414' : '#fff' }}
                    defaultActiveKey="1"
                    items={[
                        {
                            label: <b><FolderOpenOutlined />Files</b>,
                            key: '1',
                            children: <Files {...cfg} />
                        },
                        {
                            label: <b><SwapOutlined />Stream</b>,
                            key: '2',
                            children: <div>
                                <ReactJson
                                    src={stream}
                                    theme={cfg.isDarkMode ? "twilight" : "bright:inverted"}
                                    style={{ background: 'transparent' }}
                                />
                            </div>
                        },
                        {
                            label: <b><AndroidOutlined />Board</b>,
                            key: '3',
                            children: <div>
                                <ReactJson
                                    src={tunnel}
                                    theme={cfg.isDarkMode ? "twilight" : "bright:inverted"}
                                    style={{ background: 'transparent' }}
                                />
                            </div>
                        }
                    ]}
                />
            </Col>

        </Row>
    </Layout >

}