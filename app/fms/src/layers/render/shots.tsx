import { THREE } from 'uweb/three'
import { log, KeyValue } from 'utils/web'
import { Coordinate } from 'uweb/utils'
import { CSV_GeoJson_Parser, expandBoundingBox } from '../../hooks/helper'

const createTextLabel = (text: string, color = '#444', size = 1) => {
    const canvas = document.createElement('canvas');
    const context: any = canvas.getContext('2d');

    // 1. Canvas-ийн нягтаршлыг өндөр хэвээр (high-res) үлдээх
    canvas.width = 600;  // Өргөн
    canvas.height = 200; // Өндөр

    // Тунгалаг дэвсгэр
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Том фонтоор тод зурах (Чанарыг хадгалахын тулд)
    context.fillStyle = color;
    context.font = 'Bold 80px Arial'; // 10px биш, том зураад дараа нь масштабаар багасгана
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);

    // Анизотропи нэмэх (текстийг илүү тод харагдуулна)
    texture.anisotropy = 16;

    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });

    const sprite = new THREE.Sprite(spriteMaterial);

    // 3. Sprite-ийн хэмжээг энд л жижиг болгоно
    // 0.1 эсвэл 0.05 гэх мэт утгаар тоглож үзээрэй
    sprite.scale.set(0.18 * size, 0.06 * size, 1);

    return sprite;
}

const LAYER_PRESETS: any = {
    'target': '#333',
    'actual': 'red',
    'Хоосон чулуулаг': '#d48806',
    'Элсэн чулуу': '#a89030',
    'Шавар': '#8c6a3f',
    'Нүүрс': '#262626',
    'Завсар үе': '#389e0d',
    'Шавран чулуу': '#cf1322',
    'Хатуу чулуулаг': '#434343',
    'Ус': '#0284c7',
}

export class Shots {

    cfg: iArgs
    Maptalks
    obj: any = {}

    constructor(cfg: iArgs) {
        this.cfg = cfg
        this.Maptalks = cfg.MapView
    }

    get_plan = (name = '', dst = '') => new Promise<[csvItems[], {}]>((res) => {

        this.cfg.core_data.poll('get-chunks-merged', { name, dst }, (e: any, data: any = {}) => {

            console.log(`[render_plan]`, e, data)

            if (e) { res([[], {}]) } else {

                const shots = CSV_GeoJson_Parser(data)
                const box = expandBoundingBox(shots, 1)
                res([shots, box])

            }

        })

    })

    get_actual = (name = '', dst = '') => new Promise<any>((res) => {

        this.cfg.core_data.poll('get-events-shot-actual', { src: dst, type: 'shot-actual', name: name }, (e: any, data: any = []) => {

            console.log(`[render_actual]`, e, data)

            if (e) { res({}) } else {

                const acts: any = {}
                for (const x of data) {
                    const shot = JSON.parse(x.data)
                    acts[shot.holeId] = shot
                }

                res(acts)

            }

        })

    })

    remove = (key: string) => {

        if (this.obj.hasOwnProperty(key)) {

            const group = this.obj[key]
            this.Maptalks?.threeLayer.removeMesh(group)
            const nodes: any = []
            group.traverse((child: any) => { nodes.push(child) })
            nodes.forEach((node: any) => { node.removeFromParent() })
            group.clear()
            delete this.obj[key]

        }

    }

    remove_all = () => {
        for (const x in this.obj) this.remove(x)
    }

    render_all = async (key = '', name = '', dst = '') => {

        if (this.obj.hasOwnProperty(key)) this.remove(key)

        const status: any = {
            key,
            name,
            total: 0,
            drilled: 0,
            drilled_shots: [],
        }

        const group = new THREE.Group()
        const [shots, box] = await this.get_plan(name, dst)
        const actuals = await this.get_actual(name, dst)
        let is_3D_enabled = KeyValue('3D') === 'yes'
        let is_3D_diff = Number(KeyValue('Elevation'))
        this.obj[key] = group

        const altitude = (el: number) => {
            const elevation = el
            const vector3 = this.Maptalks?.threeLayer.distanceToVector3(elevation, elevation)
            const zPos = vector3.x
            return zPos
        }

        const add_cylinder = (name: string, layer: string, { x = 0, y = 0, z = 0, h = 0, s = 0 }) => {

            const height = altitude(h)
            const geometry = new THREE.CylinderGeometry(s, s, height, 8, 1)
            let material = null

            if (layer === 'target') material = new THREE.MeshStandardMaterial({
                color: 'grey',
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            else if (layer === 'actual') material = new THREE.MeshPhongMaterial({
                color: 'green',
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            else material = new THREE.MeshBasicMaterial({ color: LAYER_PRESETS[layer] ?? '#d48806' })

            const cylinder = new THREE.Mesh(geometry, material)
            cylinder.name = name
            cylinder.rotateX(Math.PI / 2)
            cylinder.position.set(x, y, z - (height / 2))
            group.add(cylinder)

        }

        const add_text = (text: string, { x = 0, y = 0, z = 0, c = '#444', s = 1 }) => {

            const label = createTextLabel(text, c, s)
            label.position.set(x, y, z)
            group.add(label)

        }

        shots.forEach(([n, x, y, z, h]: csvItems) => {

            let data = null
            const [aU, aL, oU, oL]: any = Coordinate(x, y, z - (h / 2))
            const alt = is_3D_enabled ? altitude(z - is_3D_diff) : 0
            const ralt = is_3D_enabled ? altitude(z - is_3D_diff + 1) : 0
            const cfg: any = { x: oL.x, y: oL.y, z: 0 }
            const f = this.Maptalks?.threeLayer.coordinateToVector3(cfg, 0)

            status.total++

            if (actuals[n]) {

                data = actuals[n]
                const { netDrillMs, totalPausedMs, finalDepth, entries } = data
                const sorted = entries.sort((a: any, b: any) => b.depth - a.depth)
                const filtered = sorted.filter(({ type }: any) => type === 'layer')

                data.target = h
                status.drilled_shots.push(data)

                // console.log(n, data, sorted)

                filtered.forEach(({ depth, layer }: any, i: number) => {
                    add_cylinder(n, layer, { x: f.x, y: f.y, z: alt, h: depth, s: 0.01 + (0.00025 * (++i)) })
                })

                add_cylinder(n, 'target', { x: f.x, y: f.y, z: alt, h: h, s: 0.005 })
                add_cylinder(n, 'actual', { x: f.x, y: f.y, z: alt, h: finalDepth, s: 0.0075 })
                add_text(`${n}`, { x: f.x, y: f.y, z: ralt, c: 'green', s: 1 })

                status.drilled++

            } else {
                add_cylinder(n, 'target', { x: f.x, y: f.y, z: alt, h: h, s: 0.005 })
                add_text(`${n}`, { x: f.x, y: f.y, z: ralt, s: 1 })
            }

        })

        this.obj[`report-${key}`] = { name: key, data: { status, shots } }
        this.Maptalks?.threeLayer.addMesh(group)

    }

    report = (key: string) => {

        this.cfg.event.emit('report', this.obj[`report-${key}`])

    }

}