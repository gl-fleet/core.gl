import { React, Typography } from 'uweb'
import { MapView, maptalks } from 'uweb/maptalks'
import { CloseCircleOutlined } from '@ant-design/icons'
const { Paragraph } = Typography

export class DistanceTool {

    Maptalks: MapView
    cfg: iArgs
    tool: any

    constructor(Maptalks: MapView, cfg: iArgs, message: any) {

        const als = `tool.distance`
        this.Maptalks = Maptalks
        this.cfg = cfg

        const { event } = cfg

        this.setup()

        const close = () => {
            if (this.tool.isEnabled()) {
                // message.open({ key: als, type: 'loading', content: 'Clearing ...', duration: 0.5 })
                message.destroy(als)
                this.tool.clear()
                this.tool.disable()
            }
        }

        event.on(`${als}.enable`, (n) => {

            event.emit('tools.close', true)

            message.open({
                key: als,
                duration: 0,
                content: <Paragraph
                    style={{ padding: 0, margin: 0 }}
                    copyable={{ icon: <CloseCircleOutlined />, tooltips: ['Close', 'Closed'], onCopy: () => close() }}
                >Distance Tool</Paragraph>
            })

            this.tool.enable()

        })

        event.on(`${als}.disable`, (n) => this.tool.disable())
        event.on('tools.close', () => close())

    }

    setup = () => {

        this.tool = new maptalks.DistanceTool({

            'language': 'en-US',
            'symbol': {
                'lineColor': '#34495e',
                'lineWidth': 2
            },
            'vertexSymbol': {
                'markerType': 'ellipse',
                'markerFill': '#1bbc9b',
                'markerLineColor': '#000',
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
                    'textDx': 15,
                    'markerLineColor': '#b4b3b3',
                    'markerFill': '#000'
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
                'markerDx': 20
            }, {
                'markerType': 'x',
                'markerWidth': 10,
                'markerHeight': 10,
                'markerLineColor': '#fff',
                'markerDx': 20
            }],

        }).addTo(this.Maptalks.map).disable()

        this.tool.on('drawend', (param: any) => { })

    }

}