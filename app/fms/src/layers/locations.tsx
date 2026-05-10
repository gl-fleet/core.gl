import { React, Row, Col } from 'uweb'
import { AsyncWait, Safe, KeyValue, Win } from 'utils/web'
import { THREE } from 'uweb/three'
import moment from 'moment'

import { exportCSVFile, createPane, ListWithRemove } from '../hooks/utils'
import { Shots } from './render/shots'
import { Digs } from './render/dig'

const { useEffect, useState, useRef } = React

export const goldenMaterial = () => {

    const canvasDom = document.createElement('canvas');
    const size = 16;
    canvasDom.width = size;
    canvasDom.height = size;
    const ctx: any = canvasDom.getContext('2d');
    const gradient = ctx.createRadialGradient(
        canvasDom.width / 2,
        canvasDom.height / 2,
        0,
        canvasDom.width / 2,
        canvasDom.height / 2,
        canvasDom.width / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.005, 'rgba(139,69,19,1)');
    gradient.addColorStop(0.4, 'rgba(139,69,19,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,1)');

    ctx.fillStyle = gradient;
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.Texture(canvasDom);
    texture.needsUpdate = true; //使用贴图时进行更新

    return new THREE.PointsMaterial({
        sizeAttenuation: false,
        size: 2,
        transparent: true, //使材质透明
        blending: THREE.AdditiveBlending,
        depthTest: true, //深度测试关闭，不消去场景的不可见面
        depthWrite: false,
        map: texture //刚刚创建的粒子贴图就在这里用上
    })

}

export const coloredMaterial = () => {

    const doc: any = document ?? {}

    var material = new THREE.ShaderMaterial({
        vertexShader: doc.getElementById('vertexshader').textContent,
        fragmentShader: doc.getElementById('fragmentshader').textContent,
        size: 2,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    })

    return material

}

export default (cfg: iArgs) => {

    const group: any = useRef(null)

    const addMesh = (mesh: any) => Safe(() => { mesh && cfg.MapView?.threeLayer.addMesh(mesh) }, 'Add mesh error')

    const remMesh = (mesh: any) => Safe(() => {
        cfg.MapView?.threeLayer.removeMesh(mesh)
        mesh && mesh.geometry?.dispose()
        mesh && mesh.material?.dispose()
        mesh = undefined
    }, 'Remove mesh error')

    useEffect(() => {

        let emit: any = null
        const shots = new Shots(cfg)
        const digs = new Digs(cfg)
        let list: ListWithRemove | any = null

        cfg.event.on('tool.3D.enable', (is3D) => { console.log(`3D status change: ${is3D}`) })

        cfg.event.on('layer.locations', () => {

            emit && emit('close')

            let is_3D_enabled = KeyValue('3D') === 'yes'
            let is_3D_diff = Number(KeyValue('Elevation'))

            const df = `YYYY-MM-DD HH:mm`
            const def: any = {
                Vehicles: '---',
                Start: moment().add(-(24 * 1), 'hours').format(df),
                End: moment().format(df),
                '3D': is_3D_enabled, '_3D': { disabled: true },
                Point: { r: 255, g: 55, b: 55 }, _Point: { disabled: true },
                Design: { r: 55, g: 255, b: 55 }, _Design: { disabled: true },
                'AI Integration': false, '_AI Integration': { disabled: true },
                btn: [{ title: 'Load' }, { title: 'CSV' }],
            }

            const arg = def
            let fileTitle = '-'
            let items: any = []
            let headers = {
                name: 'Name',
                time: 'Time',
                east: "East",
                north: "North",
                elevation: "Elevation",
                ondesign: "On Design",
                todesign: "To Design",
                direction: "Direction",
                precision: "Precision (GPS)",
            }

            emit = createPane('Location history...', (k: string, v: any = null) => {

                if (k === 'close') {

                    digs.remove_all()
                    shots.remove_all()
                    emit = null
                    if (group.current) remMesh(group.current)

                }

                if (k === 'change') {

                    if (Array.isArray(v.value)) {

                        const [_type, _name, _value] = v.value

                        if (_type === 'location') {

                            _value && cfg.MapView?.animateTo([_value[0], _value[1]], 0)

                            cfg.core_data.poll('get-chunks-distinct', { dst: _name }, (e: any, data: any = []) => {

                                if (Array.isArray(data) && data.length > 0) {

                                    const options: any = { '---': '---' }
                                    for (const x of data) options[x.name] = ['file', _name, x]
                                    emit('effect', { name: 'Design files', title: `Files ${_name}`, options })

                                }

                            })

                        }

                        if (_type === 'file') {

                            const [_type, _name, _value] = v.value
                            const key = `${_value.dst}:${_value.name}`

                            _value.type === 'dxf-geojson' && digs.render_plan(key, _value.name, _value.dst)
                            _value.type === 'csv-geojson' && shots.render_all(key, _value.name, _value.dst)

                            list?.addItem(key, () => {
                                console.log(`${key} is remove !!! `)
                                _value.type === 'dxf-geojson' && digs.remove(key)
                                _value.type === 'csv-geojson' && shots.remove(key)
                            }, () => {
                                console.log(`${key} is report !!! `)
                                _value.type === 'csv-geojson' && shots.report(key)
                            })

                        }

                    }

                }

                if (k === 'CSV') {

                    exportCSVFile(headers, items, fileTitle)

                }

                if (k === 'Load') {

                    emit && emit('btn', { name: 'Load', title: 'Loading...', disabled: true })
                    emit && emit('btn', { name: 'CSV', title: 'CSV', disabled: true })

                    fileTitle = `${arg.Vehicles[1]} - ${arg.Start} - ${arg.End}`

                    cfg.core_collect.pull('get-locations-by-date', { name: arg.Vehicles[1], start: arg.Start, end: arg.End }, (err: any, res: any) => {

                        if (err) {
                            console.log(err)
                            let message = err.response && err.response.data ? err.response.data : err.message
                            cfg.messageApi.warning(`Load locations error: ${message}`)
                            // setTimeout(() => { btn.disabled = false; btn.title = 'Load'; csv.disabled = false; }, 0)
                            emit && emit('btn', { name: 'Load', title: 'Load', disabled: false })
                            return

                        } else {

                            console.log('Location result', res)
                            const points: any = []
                            let i = 0

                            for (const x of res) {

                                const { east, north, elevation, data, updatedAt } = x
                                const _ = data.split('|')
                                const prc = _[4].split(',')
                                const [xlng, ylat] = _[0].split(',')
                                const coordinate: any = [Number(xlng), Number(ylat)]
                                const [scr, dir, dis] = _[6].split(',')
                                const dist = dis === '-' ? '-' : Number(dis)
                                const h = elevation - (is_3D_diff)

                                const colorPoint = `rgb(${arg.Point.r}, ${arg.Point.g}, ${arg.Point.b})`
                                const colorDesign = `rgb(${arg.Design.r}, ${arg.Design.g}, ${arg.Design.b})`

                                items.push({
                                    name: arg.Vehicles,
                                    time: moment(updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                                    east: east,
                                    north: north,
                                    elevation: elevation,
                                    ondeign: dist === '-' ? 'No' : (dist > 1 ? 'No' : 'Yes'),
                                    todesign: dist === '-' ? '-' : dis,
                                    direction: dir,
                                    precition: `${prc[3]}cm ${prc[4]}cm`,
                                })

                                points.push({
                                    coordinate,
                                    value: ++i,
                                    size: 2,
                                    height: is_3D_enabled ? h : 0,
                                    color: dist === '-' ? colorPoint : (dist > 1 ? colorPoint : colorDesign),
                                })

                            }

                            console.log('CSV', items)

                            group.current = cfg.MapView?.threeLayer.toPoints(points, {}, goldenMaterial())
                            addMesh(group.current)

                            // setTimeout(() => { btn.disabled = false; btn.title = 'Load'; csv.disabled = false; }, 0)
                            emit && emit('btn', { name: 'Load', title: 'Load', disabled: false })
                            emit && emit('btn', { name: 'CSV', title: 'CSV', disabled: false })

                        }

                    })

                }

            })

            cfg.core_collect.get("get-enums", { type: 'location.now' }).then((ls: any) => {

                const options: any = { '---': '---' }

                for (const x of ls) {

                    let sp = x.name.split('.')
                    let ki = `[${sp[1]}]${sp[2]}`
                    const parsed = JSON.parse(x.value)
                    const [_g, _g1, _g2, _gps, _gsm, _rtcm, _val] = parsed.data.split('|')
                    const g = _g.split(',')
                    const gps = [Number(g[0]), Number(g[1]), 0]
                    // obj[sp[2]] = gps
                    options[ki] = ['location', sp[2], gps]

                }

                def._Vehicles = { options }
                emit && emit(`setup`, def)
                emit && emit('btn', { name: 'CSV', disabled: true })
                emit && emit(`enable`)

                list = new ListWithRemove(document.getElementById('tweak-files'))

            }).catch((e) => emit && emit('close')).finally(() => emit && emit('title', 'Location history'))

        })

    }, [])

    return null

}