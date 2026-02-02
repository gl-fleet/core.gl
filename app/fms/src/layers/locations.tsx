import { React, Row, Col } from 'uweb'
import { AsyncWait, Safe, dateFormat } from 'utils/web'
import { THREE } from 'uweb/three'
import moment from 'moment'

import { exportCSVFile } from '../hooks/utils'

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

    const [on, setOn] = useState(false)
    const folder: any = useRef(null)
    const group: any = useRef(null)

    const addMesh = (mesh: any) => Safe(() => {
        mesh && cfg.MapView?.threeLayer.addMesh(mesh)
    }, 'Add mesh error')

    const remMesh = (mesh: any) => Safe(() => {
        cfg.MapView?.threeLayer.removeMesh(mesh)
        mesh && mesh.geometry?.dispose()
        mesh && mesh.material?.dispose()
        mesh = undefined
    }, 'Remove mesh error')

    useEffect(() => { cfg.event.on('layer.locations', () => setOn((v) => !v)) }, [])

    useEffect(() => {

        if (cfg.Pane) {

            if (on === false) {

                folder.current && folder.current.dispose()
                if (group.current) remMesh(group.current)

            } else {

                const df = `YYYY-MM-DD HH:mm`
                const arg = {
                    Vehicles: '',
                    Start: moment().add(-(24 * 2), 'hours').format(df),
                    End: moment().format(df),
                    '3D': false,
                    Point: { r: 255, g: 55, b: 55 },
                    Design: { r: 55, g: 255, b: 55 },
                    TranslateX: -1000,
                    'AI Integration': false,
                }

                folder.current = cfg.Pane.addFolder({ title: 'Locations loading ...' })

                cfg.core_collect.get("get-enums", { type: 'location.now' }).then((ls: any) => {

                    folder.current.title = 'Locations'

                    let fileTitle = '-'
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
                    let items: any = []
                    const options: any = {}
                    const obj: any = {}

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

                    folder.current.on('change', (ev: any) => {

                        const gps = obj[arg.Vehicles]
                        gps && cfg.MapView?.animateTo([gps[0], gps[1]], 0)

                    })

                    folder.current.addBinding(arg, 'Vehicles', { options })
                    folder.current.addBinding(arg, 'Start')
                    folder.current.addBinding(arg, 'End')
                    folder.current.addBinding(arg, 'Point', { disabled: true })
                    folder.current.addBinding(arg, 'Design', { disabled: true })
                    folder.current.addBinding(arg, '3D')
                    folder.current.addBinding(arg, 'TranslateX', { min: -5000, max: 5000 })
                    folder.current.addBinding(arg, 'AI Integration', { disabled: true })

                    const btn = folder.current.addButton({ label: '', title: 'Load' })
                    const csv = folder.current.addButton({ label: '', title: 'CSV', disabled: true })

                    btn.on('click', () => {

                        console.log('Query params', arg)
                        btn.disabled = true; btn.title = 'Loading...';
                        fileTitle = `${arg.Vehicles}-${arg.Start}-${arg.End}`

                        cfg.core_collect.pull('get-locations-by-date', { name: arg.Vehicles, start: arg.Start, end: arg.End }, (err: any, res: any) => {

                            if (err) {

                                let message = err.response && err.response.data ? err.response.data : err.message
                                cfg.messageApi.warning(`Load locations error: ${message}`)
                                setTimeout(() => { btn.disabled = false; btn.title = 'Load'; csv.disabled = false; }, 0)
                                return

                            } else {

                                console.log('Location result', res)
                                const points: any = []
                                let minElev = 99999, maxElev = -99999, top = 0
                                let i = 0

                                for (const x of res) {
                                    const { east, north, elevation, data, updatedAt } = x
                                    if (elevation < minElev) minElev = elevation
                                    if (elevation > maxElev) maxElev = elevation
                                }

                                top = maxElev - minElev

                                for (const x of res) {

                                    const { east, north, elevation, data, updatedAt } = x
                                    const _ = data.split('|')
                                    const prc = _[4].split(',')
                                    const [xlng, ylat] = _[0].split(',')
                                    const coordinate: any = [Number(xlng), Number(ylat)]
                                    const [scr, dir, dis] = _[6].split(',')
                                    const dist = dis === '-' ? '-' : Number(dis)
                                    const h = elevation + (arg.TranslateX)
                                    const colorPoint = `rgb(${arg.Point.r},${arg.Point.g},${arg.Point.b})`
                                    const colorDesign = `rgb(${arg.Design.r},${arg.Design.g},${arg.Design.b})`

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
                                        height: arg['3D'] ? h : 0,
                                        color: dist === '-' ? colorPoint : (dist > 1 ? colorPoint : colorDesign),
                                    })

                                }

                                console.log('CSV', items)

                                group.current = cfg.MapView?.threeLayer.toPoints(points, {}, goldenMaterial())
                                addMesh(group.current)

                                setTimeout(() => { btn.disabled = false; btn.title = 'Load'; csv.disabled = false; }, 0)

                            }

                        })

                    })

                    csv.on('click', () => exportCSVFile(headers, items, fileTitle))

                }).catch(err => {

                    folder.current && folder.current.dispose()
                    setOn(false)
                    let message = err.response && err.response.data ? err.response.data : err.message
                    cfg.messageApi.warning(`Load locations error: ${message}`)

                })

            }

        }

    }, [on])

    return null

}