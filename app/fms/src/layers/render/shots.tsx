import { THREE } from 'uweb/three'
import { log, KeyValue } from 'utils/web'
import { Coordinate } from 'uweb/utils'
import { CSV_GeoJson_Parser, expandBoundingBox } from '../../hooks/helper'

const createTextLabel = (text: string) => {
    const canvas = document.createElement('canvas');
    const context: any = canvas.getContext('2d');

    // 1. Canvas-ийн нягтаршлыг өндөр хэвээр (high-res) үлдээх
    canvas.width = 512;  // Өргөн
    canvas.height = 256; // Өндөр

    // Тунгалаг дэвсгэр
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Том фонтоор тод зурах (Чанарыг хадгалахын тулд)
    context.fillStyle = '#444';
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
    sprite.scale.set(0.16, 0.08, 1);

    return sprite;
}

const LAYER_PRESETS: any = {
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

        const group = new THREE.Group()
        this.obj[key] = group

        const [shots, box] = await this.get_plan(name, dst)
        const actuals = await this.get_actual(name, dst)

        let is_3D_enabled = KeyValue('3D') === 'yes'
        let is_3D_diff = Number(KeyValue('Elevation'))

        const altitude = (el: number) => {
            const elevation = el || 1500
            const vector3 = this.Maptalks?.threeLayer.distanceToVector3(elevation, elevation)
            const zPos = vector3.x
            return zPos
        }

        shots.forEach(([n, x, y, z, h]: csvItems) => {

            let div = 50, data = null, hasEntry = false
            const [aU, aL, oU, oL]: any = Coordinate(x, y, z - (h / 2))
            const alt = is_3D_enabled ? altitude(z - is_3D_diff - (h / 2)) : -((h / div) / 2)
            const ralt = is_3D_enabled ? altitude(z - is_3D_diff) : 0
            const cfg: any = { x: oL.x, y: oL.y, z: 0 }
            const f = this.Maptalks?.threeLayer.coordinateToVector3(cfg, 0)

            const label = createTextLabel(n) // 'n' нь таны нэр
            label.position.set(f.x, f.y, ralt) // Цилиндрийн орой дээр
            group.add(label)

            if (actuals[n]) {

                hasEntry = true
                data = actuals[n]
                const { netDrillMs, totalPausedMs, finalDepth, entries } = data
                const sorted = entries.sort((a: any, b: any) => a.depth - b.depth).filter(({ type }: any) => type === 'layer')

                sorted.forEach(({ depth, layer }: any, i: number) => {

                    const geometry = new THREE.CylinderGeometry((0.180 - (i * 0.01)) / div, (0.180 - (i * 0.01)) / div, depth / div, 8, 1)
                    const material = new THREE.MeshBasicMaterial({ color: LAYER_PRESETS[layer] ?? '#d48806' })
                    const cylinder = new THREE.Mesh(geometry, material)
                    cylinder.rotateX(Math.PI / 2)
                    cylinder.name = n
                    // cylinder.position.set(f.x, f.y, -(((depth) / div) / 2))
                    cylinder.position.set(f.x, f.y, alt)
                    cylinder.z = alt
                    group.add(cylinder)

                })

            }

            const geometry = new THREE.CylinderGeometry(0.100 / div, 0.100 / div, h / div, 8, 1)
            const material = new THREE.MeshBasicMaterial({ color: hasEntry ? '#d48806' : '#1668dc' })
            const cylinder = new THREE.Mesh(geometry, material)
            cylinder.rotateX(Math.PI / 2)
            cylinder.name = n
            // cylinder.position.set(f.x, f.y, -((h / div) / 2))
            cylinder.position.set(f.x, f.y, alt)
            cylinder.z = alt
            group.add(cylinder)

        })

        this.Maptalks?.threeLayer.addMesh(group)

    }

}