import { React, Typography, Space, Button, Select } from 'uweb'
import { MapView, maptalks } from 'uweb/maptalks'
import { CloseCircleOutlined } from '@ant-design/icons'
const { Paragraph } = Typography

export class GeometryTool {

    Maptalks: MapView
    cfg: iArgs
    tool: any
    layer: any
    notif: any

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

        this.tool = new maptalks.DrawTool({

            mode: 'LineString',

            'language': 'en-US',
            'symbol': {
                'lineColor': '#1bbc9b',
                'lineWidth': 2,
                'polygonFill': '#fff',
                'polygonOpacity': 0.3
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

        this.layer = new maptalks.VectorLayer('geometry').addTo(this.Maptalks.map)

        this.tool.on('drawend', ({ geometry }: any) => {

            console.log(geometry.toJSON())
            this.layer.addGeometry(geometry)
            geometry.startEdit()

            this.notif.success({
                key: geometry.type,
                message: `${geometry.type}`,
                placement: 'bottom',
                duration: 0,
                description:
                    <Space direction="vertical" style={{ padding: 0, margin: 0, width: '100%' }}>
                        <Select style={{ width: '100%' }} />
                        <Select style={{ width: '100%' }} />
                    </Space>,
                btn:
                    <Space>
                        <Button type="link" size="small" onClick={() => {
                            geometry.endEdit()
                            console.log(geometry.toJSON()) /** Confirmed: Geometry object updated **/
                        }}>Prepare</Button>
                        <Button type="link" size="small" onClick={() => this.notif.destroy(geometry.type)}>Close</Button>
                        <Button disabled type="primary" size="small" onClick={() => this.notif.destroy(geometry.type)}>Save</Button>
                    </Space>,
            })

        })

    }

}