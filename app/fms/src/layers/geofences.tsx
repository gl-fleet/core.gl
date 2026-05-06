import { React } from 'uweb'
import { Delay, AsyncWait, Safe, dateFormat, } from 'utils/web'
import { maptalks } from 'uweb/maptalks'

import { createGlobalStyle } from 'styled-components'
import { createPane } from '../hooks/utils'

const { useEffect, useState, useRef } = React

const GlobalStyle = createGlobalStyle`

    .maptalks-menu ul{
        font-weight: bold;
        width:90px;
        list-style:none;
        padding:0;
        margin:0;
        display:block;
        background-color: ${({ dark = true }) => dark ? '#37383d' : '#727272'} !important;
        color: ${({ dark = true }) => !dark ? '#fff' : '#fff'} !important;
    }
    .maptalks-menu li{padding:0 8px;font-size:12px;line-height:24px;display:block}
    .maptalks-menu li:hover{background:#1677ff;cursor:pointer;color:#fff}
    .maptalks-menu li+li{border-top:1px solid #bbb}

    .maptalks-menu {
        width: 90px !important;
        padding: 0px !important;
        margin: 0px !important;
    }

`

const cf: any = {
    'Circle': 'Polygon',
    'Polygon': 'Polygon',
    'Rectangle': 'Polygon',
    'LineString': 'LineString'
}

const dc = `#1677ff`

/** ~~~ ~~~ ~~~ Re-writing ~~~ ~~~ ~~~ **/

class DrawShape {

    cfg: iArgs
    layer: any = null

    obj: any = {}
    updatedAt: any = ""

    last: any = ""
    lastAdded: any = null
    lastEdit: any = null
    cb: any = null

    constructor(cfg: iArgs) {

        this.cfg = cfg
        this.layer = new maptalks.VectorLayer('geometry')
        cfg.MapView?.map.addLayer(this.layer)
        this.layer.bringToBack()

        cfg.core_data.on('shapes', (note: string) => this.pullShapes(true))

    }


    dispose = (t = '') => {

        if (this.lastEdit === null) return

        if (this.lastEdit.isNew) {

            this.lastEdit.off()
            this.lastEdit.remove()

        } else {

            this.lastEdit.endEdit()

        }

    }

    addGeometry = (e: any, geometry: any) => {

        if (this.obj.hasOwnProperty(e.id)) {

            this.obj[e.id].off()
            this.obj[e.id].remove()
            delete this.obj[e.id]

        }

        const startEdit = (t = 'create') => {

            if (this.lastEdit && this.lastEdit.id !== geometry.id) this.lastEdit.endEdit()
            this.cb && this.cb(e.type, { ...e, _: t }, geometry)
            this.lastEdit = geometry

        }

        geometry.id = e.id
        geometry.isNew = e.id === '-'
        geometry.config('smoothness', e.bezier)
        // geometry.setOptions({ interactive: false }) will break the edit mode, so using symbol to disable events instead

        if (e.type === 'LineString') {

            geometry.updateSymbol({
                textName: e.name, 'lineColor': e.color, 'lineWidth': e.thick, 'polygonFill': '#2B65EC', 'polygonOpacity': 0.1,
                textHaloRadius: 0, lineJoin: 'round', lineCap: 'round', 'textPlacement': 'line', textStyle: 'italic', textFill: 'grey', textSize: 10, textDy: -8,
            })

        } else {

            if (e.fill) {

                geometry.updateSymbol({
                    textName: e.name, 'lineColor': e.color, 'lineWidth': e.thick, 'polygonFill': '#2B65EC', 'polygonOpacity': 0.1,
                    textHaloRadius: 1,
                })

            } else {

                geometry.updateSymbol({
                    textName: e.name, 'lineColor': e.color, 'lineWidth': e.thick, 'polygonFill': e.fill ? '#2B65EC' : null, 'polygonOpacity': 0.1,
                    lineJoin: 'round', lineCap: 'round', 'textPlacement': 'line', textStyle: 'italic', textFill: 'grey', textSize: 10, textDy: -8,
                })

            }

        }

        geometry
            .on('mouseenter', (e: any) => { e.target.updateSymbol({ 'lineOpacity': '0.8' }) })
            .on('mouseout', (e: any) => { e.target.updateSymbol({ 'lineOpacity': '0.9' }) })
            .on('editstart', ({ target }: any) => startEdit())
            .on('shapechange', ({ target }: any) => startEdit('update'))
            .on('positionchange', ({ target }: any) => startEdit('update'))
            // .on('dblclick', (e: any) => geometry.endEdit())
            // .on('editend', ({ target }: any) => { })
            .on('contextmenu', (e: any) => geometry.openMenu())

        this.obj[e.id] = geometry
        this.layer.addGeometry(geometry)

        geometry.setMenu({
            items: [
                { item: 'Edit', click: () => { !geometry.isEditing() && geometry.startEdit() } },
                { item: 'Cancel', click: () => { this.cb && this.cb('close') } },
            ]
        })

    }

    pullShapes = (latest = false) => {

        const fill = (data: any) => {

            data.map((raw: any) => {

                const { id = '-', type, name, geojson, rules, style, connect, updatedAt, deletedAt } = raw
                const styles = JSON.parse(style)

                let geometry = maptalks.GeoJSON.toGeometry({ "name": raw.name, "type": "Feature", "geometry": { "type": cf[type], "coordinates": JSON.parse(geojson) } })

                if (type === 'Circle') {

                    const coords = geometry.getCoordinates()[0]
                    const p1 = coords[0], p2 = coords[Math.floor(coords.length / 2)]
                    const center = [(p1.x + p2.x) / 2, (p1.y + p2.y) / 2]
                    const radius = this.cfg.MapView?.map.computeLength(center, [p1.x, p1.y])
                    geometry = new maptalks.Circle(center, radius, { numberOfShellPoints: 25 })

                }

                /** Render Polygon as Linestring when fill is not set **/
                if ((type === 'Polygon' || type === 'Rectangle') && styles?.fill === false) {

                    const rings = geometry.getCoordinates() // array of rings
                    const outerRing = rings[0]              // ignore holes if you want
                    geometry = new maptalks.LineString(outerRing)

                }

                geometry.drawMode = type

                if (updatedAt > this.updatedAt) this.updatedAt = updatedAt

                if (deletedAt) {

                    if (this.obj.hasOwnProperty(id)) {

                        this.obj[id].off()
                        this.obj[id].remove()
                        delete this.obj[id]

                    }

                } else {

                    // console.log(`Adding geometry`, raw)
                    this.addGeometry({ id, type, name, rules, connect, ...styles, delete: deletedAt ? true : false }, geometry)

                }

            })

        }

        if (latest && this.updatedAt !== "") this.cfg.core_data.pull('get-shapes', { updatedAt: this.updatedAt }, (err, data) => {

            if (err) this.cfg.messageApi.warning(err.response && err.response.data ? err.response.data : err.message)
            else fill(data)

        })
        else this.cfg.core_data.pull('get-shapes', {}, (err, data) => {

            if (err) this.cfg.messageApi.warning(err.response && err.response.data ? err.response.data : err.message)
            else fill(data)

        })

    }

}

class DrawTool {

    tool: any = null
    mode: any = 'LineString'
    cb: any = null

    constructor(cfg: iArgs) {

        const no_type: any = maptalks
        this.tool = new no_type.DrawTool({
            mode: this.mode,
            language: 'en-US',
            numberOfVertices: 12,
            'symbol': {
                'lineColor': '#1677ff',
                'lineWidth': 2,
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

        }).addTo(cfg.MapView?.map).disable()

        let map: any = cfg.MapView?.map
        // When DrawTool is enabled, set cursor to crosshair 
        this.tool.on('enable', () => Safe(() => { map.getRenderer().canvas.style.cursor = 'crosshair' }))
        // When DrawTool is disabled, reset cursor back to default 
        this.tool.on('disable', () => Safe(() => { map.getRenderer().canvas.style.cursor = '' }))

        this.tool.on('drawend', ({ geometry }: any) => {

            this.tool.getMode() === 'circle' && geometry.setOptions({ numberOfShellPoints: 25 })
            this.cb && this.cb(this.mode, geometry)

        })

    }

    enable = () => this.tool.enable()
    disable = () => this.tool.disable()
    setMode = (_mode: string) => {
        this.mode = _mode
        this.tool.setMode(_mode).enable()
    }

}

export default (cfg: iArgs) => {

    useEffect(() => {

        const obj: any = {}
        let emit: any = null
        let geometry: any = null
        let base = {
            id: '-',
            type: '',
            name: '',
            /*** --- styles --- ***/
            color: dc,
            thick: 1,
            fill: true,
            bezier: 0,
            /*** --- --- --- ***/
            geojson: '',
            rules: '',
            connect: '',
            delete: false,
            btn: [{ title: 'Save' }],
            /*** --- --- --- ***/
            _type: { disabled: true },
            _thick: { step: 1, min: 1, max: 10 },
            _bezier: { step: 0.1, min: 0, max: 1 },
            _geojson: { disabled: true },
            _rules: {
                options: {
                    '---': '---',
                    'Loading Area': 'Load',
                    'Dumping Area': 'Dump',
                    'Parking Area': 'Park',
                    'Fuel Station': 'Fuel',
                    'Maintenance Area': 'Maintenance',
                    'Alert enter': 'Alert on Entry',
                    'Alert exit': 'Alert on Exit',
                }
            },
            _connect: { disabled: true },
        }

        let def = JSON.parse(JSON.stringify(base))

        const tool = new DrawTool(cfg)
        const shape = new DrawShape(cfg)

        shape.pullShapes(false)

        /** Create shape **/
        tool.cb = (type: string, g: any) => {

            def.type = type
            shape.addGeometry(def, g)
            g.startEdit()

        }

        /** Edit shape **/
        shape.cb = (type: string, c: any = {}, g: any) => {

            if (type === 'close') {
                emit('close')
                return
            }

            geometry = g

            def.geojson = JSON.stringify(g.toGeoJSON().geometry.coordinates)

            if (c._ === 'update') {
                emit && emit(`effect`)
            }

            if (c._ === 'create') {
                def = { ...def, ...c }
                cfg.event.emit('layer.geofences', { title: `Edit ${type}`, value: type })
            }

        }

        /** Pane start **/
        cfg.event.on('layer.geofences', ({ title, value }) => {

            emit && emit('close')

            cfg.event.emit('map:edit', true)

            if (title.indexOf('Create') === 0) {

                def = { ...JSON.parse(JSON.stringify(base)), type: value }
                tool.setMode(value)

            }

            emit = createPane(`${title} ...`, (k: string, v: any = null) => {

                if (k === 'change' && geometry) {

                    const { name, color, thick, bezier, fill } = def
                    geometry.config('smoothness', bezier)
                    geometry.updateSymbol({ textName: name, 'lineColor': color, 'lineWidth': thick, 'polygonFill': fill ? '#2B65EC' : null, 'polygonOpacity': 0.1, textHaloRadius: 1 })
                    geometry.hide()
                    geometry.show()
                    geometry.setCoordinates(geometry.getCoordinates())

                }

                if (k === 'Save') {

                    const style = JSON.stringify({
                        color: def.color,
                        thick: def.thick,
                        fill: def.fill,
                        bezier: def.bezier,
                    })

                    emit && emit('btn', { name: 'Save', title: 'Saving...', disabled: true })

                    const payload: any = JSON.parse(JSON.stringify({ ...def, style }))

                    for (const key in payload) {

                        if (payload[key] === '---') payload[key] = null
                        if (key.startsWith('_')) delete payload[key]

                    }

                    cfg.core_data.push('set-shapes', payload, (err, data) => {

                        if (err) { cfg.messageApi.warning(err.response && err.response.data ? err.response.data : err.message) } else {

                            cfg.messageApi.success(data)
                            emit && emit('close')

                        }

                        emit && emit('btn', { name: 'Save', title: 'Save', disabled: false })

                    })

                }

                if (k === 'close') {
                    emit = null
                    tool.disable()
                    geometry && shape.dispose()
                    cfg.event.emit('map:edit', false)
                }

            })

            if (value === 'Circle') {

                cfg.core_collect.get("get-enums", { type: 'location.now' }).then((ls: any) => {

                    const options: any = { '---': '---' }

                    for (const x of ls) {

                        let sp = x.name.split('.')
                        let ki = `[${sp[1]}] ${sp[2]}`
                        options[ki] = sp[2]
                        const parsed = JSON.parse(x.value)

                        const [_g, _g1, _g2, _gps, _gsm, _rtcm, _val] = parsed.data.split('|')
                        const g = _g.split(',')
                        const gps = [Number(g[0]), Number(g[1]), 0]
                        obj[sp[2]] = gps

                    }

                    def.connect = def.connect ?? ''
                    def._connect = { disabled: false, options }

                    emit && emit(`setup`, def)
                    emit && emit(`enable`)

                    if (title.indexOf('Edit') === 0) emit && emit(`enable`)

                }).catch((e) => emit && emit('close')).finally(() => emit && emit('title', title))

            } else {

                def.connect = ''
                def._connect = { disabled: true, options: { '---': '---' } }

                emit && emit(`setup`, def)
                emit && emit(`enable`)
                emit && emit('title', title)

            }

        })

    }, [])

    return <GlobalStyle dark={cfg.isDarkMode} />

}