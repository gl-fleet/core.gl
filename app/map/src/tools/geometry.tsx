import { React, Typography, Space, Button, Select, Input } from 'uweb'
import { MapView, maptalks } from 'uweb/maptalks'
import { CloseCircleOutlined } from '@ant-design/icons'
const { Paragraph } = Typography

const poly = {
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [
                    105.51444676041994,
                    43.67618398282544
                ],
                [
                    105.51399058886133,
                    43.675323982674186
                ],
                [
                    105.51234754279724,
                    43.67437063476913
                ],
                [
                    105.5121658443074,
                    43.6742296201883
                ],
                [
                    105.51229060616768,
                    43.67372474020418
                ],
                [
                    105.51273410846632,
                    43.67330350336383
                ],
                [
                    105.51390295402707,
                    43.67211569944896
                ],
                [
                    105.51480089910795,
                    43.67145680889911
                ],
                [
                    105.51444676041994,
                    43.67618398282544
                ]
            ]
        ]
    },
    "properties": null
}

const rect = {
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [
                    105.51824845839818,
                    43.674347031232735
                ],
                [
                    105.52187398324259,
                    43.674347031232735
                ],
                [
                    105.52172819387212,
                    43.67211569944896
                ],
                [
                    105.51839786986484,
                    43.67211569944896
                ],
                [
                    105.51824845839818,
                    43.674347031232735
                ]
            ]
        ]
    },
    "properties": null
}

const line = {
    "type": "Feature",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [
                105.51396647363293,
                43.67621085763154
            ],
            [
                105.52256361257322,
                43.67618398282544
            ],
            [
                105.52334339491927,
                43.67573454486251
            ],
            [
                105.52381011546572,
                43.67519807212345
            ],
            [
                105.52557140949314,
                43.67330350336383
            ],
            [
                105.52356108467343,
                43.67283201020061
            ],
            [
                105.52322545667498,
                43.67266471198577
            ],
            [
                105.52317309411083,
                43.67051322900205
            ],
            [
                105.52064491403978,
                43.67039172611124
            ],
            [
                105.51941471352617,
                43.67015243908674
            ],
            [
                105.5172230991431,
                43.66990141958943
            ]
        ]
    },
    "properties": null
}

export class GeometryTool {

    Maptalks: MapView
    cfg: iArgs
    tool: any
    layer: any
    notif: any
    geometry: any

    constructor(Maptalks: MapView, cfg: iArgs, message: any, notif: any) {

        const als = `geometry.tool`
        this.Maptalks = Maptalks
        this.cfg = cfg
        this.notif = notif

        const { event } = cfg

        this.setup()

        const close = () => {
            if (this.tool.isEnabled()) {
                // message.open({ key: als, type: 'loading', content: 'Clearing ...', duration: 0.5 })
                message.destroy(als)
                this.layer.clear()
                this.layer.hide()
                this.tool.disable()
            }
        }

        event.on(`${als}.enable`, (value: string = 'LineString') => {

            event.emit('tools.close', true)
            this.geometry = value

            message.open({
                key: als,
                duration: 0,
                content: <Paragraph
                    style={{ padding: 0, margin: 0 }}
                    copyable={{ icon: <CloseCircleOutlined />, tooltips: ['Close', 'Closed'], onCopy: () => close() }}
                >{value} Tool</Paragraph>
            })

            this.layer.show()
            this.tool.setMode(value).enable()
            this.tool.enable()

        })

        event.on(`${als}.disable`, (n) => this.tool.disable())
        event.on('tools.close', () => close())

    }

    setup = () => {

        const no_type: any = maptalks
        this.tool = new no_type.DrawTool({

            mode: 'LineString',
            'language': 'en-US',
            'symbol': {
                'lineColor': '#2B65EC',
                'lineWidth': 2,
                // 'polygonFill': '#2B65EC',
                // 'polygonOpacity': 0.3
            },
            'vertexSymbol': {
                'markerType': 'ellipse',
                'markerFill': '#34495e',
                'markerLineColor': '#1bbc9b',
                'markerLineWidth': 3,
                'markerWidth': 10,
                'markerHeight': 10
            },
            'labelOptions': {
                'textSymbol': {
                    'textFaceName': 'monospace',
                    'textFill': '#fff',
                    'textLineSpacing': 1,
                    'textHorizontalAlignment': 'right',
                    'textDx': 15
                },
                'boxStyle': {
                    'padding': [6, 2],
                    'symbol': {
                        'markerType': 'square',
                        'markerFill': '#000',
                        'markerFillOpacity': 0.9,
                        'markerLineColor': '#b4b3b3'
                    }
                }
            },
            'clearButtonSymbol': [{
                'markerType': 'square',
                'markerFill': '#000',
                'markerLineColor': '#b4b3b3',
                'markerLineWidth': 2,
                'markerWidth': 15,
                'markerHeight': 15,
                'markerDx': 22
            }, {
                'markerType': 'x',
                'markerWidth': 10,
                'markerHeight': 10,
                'markerLineColor': '#fff',
                'markerDx': 22
            }],

        }).addTo(this.Maptalks.map).disable()

        this.layer = new maptalks.VectorLayer('geometry')
        this.Maptalks.map.addLayer(this.layer)
        this.layer.bringToBack()

        const _poly = maptalks.GeoJSON.toGeometry(poly)
        _poly.updateSymbol({ 'lineColor': '#2B65EC', 'lineWidth': 2 });
        this.layer.addGeometry(_poly)

        const _rect = maptalks.GeoJSON.toGeometry(rect)
        _rect.updateSymbol({ 'lineColor': 'orange', 'lineWidth': 2 });
        this.layer.addGeometry(_rect)

        const _line = maptalks.GeoJSON.toGeometry(line)
        _line.updateSymbol({ 'lineColor': 'red', 'lineWidth': 2 });
        this.layer.addGeometry(_line)

        this.tool.on('drawend', ({ geometry }: any) => {

            let name = ''
            this.layer.addGeometry(geometry)
            geometry.startEdit()

            this.notif.success({
                style: { zIndex: 10 },
                key: geometry.type,
                message: `${geometry.type}`,
                placement: 'bottom',
                duration: 0,
                description:
                    <Space direction="vertical" style={{ padding: 0, margin: 0, marginTop: 16, width: '100%', zIndex: 2051 }}>
                        <Select
                            disabled={true}
                            defaultValue={this.geometry}
                            style={{ width: '100%', zIndex: 2052 }}
                            dropdownStyle={{ zIndex: 2052 }}
                            options={[
                                { value: 'LineString', label: 'Path' },
                                { value: 'Polygon', label: 'Boundary' },
                                { value: 'Circle', label: 'Circle' },
                                { value: 'Rectangle', label: 'Rectangle' },
                            ]}
                        />
                        <Input placeholder="Name" onChange={(e) => { name = e.target.value }} />
                    </Space>,
                btn:
                    <Space>
                        <Button type="link" size="small" onClick={() => {

                            this.layer.removeGeometry(geometry)
                            this.notif.destroy(geometry.type)

                        }}>Close</Button>
                        <Button type="primary" size="small" onClick={() => {

                            if (typeof name === 'string' && name.length > 0) {

                                geometry.endEdit()
                                const geoJSON = { name, ...geometry.toGeoJSON() }
                                console.log(geoJSON)
                                this.notif.destroy(geometry.type)

                            }

                        }}>Save</Button>
                    </Space>,
            })

        })

    }

}