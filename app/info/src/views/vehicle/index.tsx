import { React, Layout, Tabs, Row, Col, Space, Typography, Button, Tooltip } from 'uweb'
import { FolderOpenOutlined, SwapOutlined, AndroidOutlined, DesktopOutlined } from '@ant-design/icons'
import { MapView } from 'uweb/maptalks'
import ReactJson from 'react-json-view'
import { oget } from 'utils/web'
import { LoadRequiredFiles } from 'uweb/utils'

import { parseLocation, Style, getVehicle, UpdateStatus } from './helper'
import StreamView from './stream'
import Files from './files'

const { useEffect, useState } = React
const { Title, Text } = Typography

export default (cfg: iArgs) => {

    const [stream, setStream] = useState<any>({ loading: true, err: "", data: {} })

    useEffect(() => {

        const params = (new URL(document.location.toString())).searchParams
        const proj = params.get('project')
        const type = params.get('type')
        const name = params.get('name')
        const key = `${proj}.${type}.${name}`

        const types = {
            'free': 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'topo': 'https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=l4hWJmvvmISSL7tpiPUZ',
            'satellite': 'https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}.jpg?key=l4hWJmvvmISSL7tpiPUZ',
            'openstreet': 'https://api.maptiler.com/maps/openstreetmap/{z}/{x}/{y}.jpg?key=l4hWJmvvmISSL7tpiPUZ',
        }

        const map = new MapView({
            containerId: 'render_vhc',
            zoom: 19,
            devicePixelRatio: 1,
            isDarkMode: cfg.isDarkMode,
            urlTemplate: types.free,
            stats: null,
        })

        map.onReady(() => {

            LoadRequiredFiles(() => {

                getVehicle(map, type ?? "").then((vehicle) => {

                    vehicle.animate("Take 001", { loop: true, speed: 0.5 })

                    vehicle.on((ename: string, arg: any) => {

                        ename === 'position-map' && arg.gps && arg.gps.x && map.map.setCenter(arg.gps)

                    })

                    const update = (location: any) => {

                        const obj: any = parseLocation(location)
                        setStream({ loading: false, err: "", data: obj })
                        vehicle.update(obj)

                    }

                    const get_initial_location = () => cfg.core_collect.get('get-locations-last', { name })
                        .then((location) => update(location))
                        .catch((error) => console.error(error))

                    get_initial_location()
                    cfg.core_collect.on(key, (location) => update(location))
                    cfg.core_collect.cio.on("connect", () => get_initial_location())

                })

            })

        })

    }, [])

    return <Layout style={{ padding: 16 }}>
        <Row gutter={[16, 16]} id="main">

            <Style color={cfg.isDarkMode ? '#000' : '#f5f5f5'} />

            <Col id="stream_view" span={24} style={{ position: 'relative' }}>

                <Title level={5} style={{ position: 'absolute', top: 16, left: 24, zIndex: 100, margin: 0, border: 'none' }}>
                    <span>{stream.data.project} / {stream.data.type} / {stream.data.name}</span>
                    <p style={{ color: '#1668dc', fontSize: 10, fontWeight: 800, margin: '4px 0px' }}>{oget('***')(stream.data, 'gsm', 'operator')}</p>
                    <p style={{ color: '#1668dc', fontSize: 10, fontWeight: 800, margin: '4px 0px' }}>{oget('***')(stream.data, 'network_usage')}</p>
                </Title>

                <Title level={5} style={{ position: 'absolute', top: 16, right: 24, zIndex: 100, margin: 0 }}>
                    <span>{Number(oget('0')(stream.data, 'speed')).toFixed(1)}km/h </span>
                    <span style={{ textTransform: 'capitalize' }}>{oget('***')(stream.data, 'activity')}</span>

                    {oget(0)(stream.data, 'val', 'screen') > 1 ? (
                        <p style={{ color: '#1668dc', fontSize: 10, fontWeight: 800, margin: '4px 0px' }}>
                            Indicating a space of [{oget('***')(stream.data, 'val', 'value')}] to [{oget('***')(stream.data, 'val', 'type')}]
                        </p>
                    ) : null}

                </Title>

                <div style={{ position: 'absolute', bottom: 16, right: 24, zIndex: 100, margin: 0, textTransform: 'capitalize' }}>
                    <Space wrap>
                        <Tooltip title={stream.data.tablet ? 'VNC: Tablet connected' : 'VNC: Tablet disconnected!'}>
                            <Button danger={!stream.data.tablet} type="primary" ghost icon={<DesktopOutlined />} />
                        </Tooltip>
                        <UpdateStatus data={stream.data} />
                    </Space>
                </div>

                <StreamView {...stream} />

                <div id='render_vhc' style={{ boxShadow: '0px 0px 2px rgba(0,0,0,0.25)', position: 'relative', height: 198 + 27, width: '100%', borderRadius: 8, overflow: 'hidden' }}></div>

            </Col>

            <Col span={24} style={{ overflowX: 'hidden' }}>
                <Tabs
                    style={{ borderRadius: 8, padding: 1, background: cfg.isDarkMode ? '#141414' : '#fff' }}
                    defaultActiveKey="1"
                    items={[
                        {
                            label: <b><FolderOpenOutlined />{' '}Files</b>,
                            key: '1',
                            children: <Files {...cfg} />
                        },
                        {
                            label: <b><SwapOutlined />{' '}Stream</b>,
                            key: '2',
                            children: <div>
                                <ReactJson
                                    src={stream}
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