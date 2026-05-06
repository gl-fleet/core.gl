import { Point, UTM, colorize } from 'uweb/utils'
import { THREE, ThreeView } from 'uweb/three'
import { MapView } from 'uweb/maptalks'
import { Delay, log, KeyValue } from 'utils/web'

const stringToColour = (str: string) => {
    let hash = 0;
    str.split('').forEach(char => { hash = char.charCodeAt(0) + ((hash << 5) - hash) })
    let colour = '#'
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff
        colour += value.toString(16).padStart(2, '0')
    }
    return colour
}

export class LineString {

    Three
    Maptalks
    obj: any = {}

    constructor({ Maptalks, Three }: { Maptalks?: MapView, Three?: ThreeView }) {
        this.Three = Three
        this.Maptalks = Maptalks
    }

    altitude = (el: number) => {
        const elevation = el || 1500
        const vector3 = this.Maptalks?.threeLayer.distanceToVector3(elevation, elevation)
        const zPos = vector3.x
        return zPos
    }

    add = (group: any, rows: tItem[]) => {
        const is = (m: any[]) => isNaN(m[0]) || isNaN(m[1]) || isNaN(m[2]) ? false : true
        try {

            let is_3D_enabled = KeyValue('3D') === 'yes'
            let is_3D_diff = Number(KeyValue('Elevation'))

            for (const n of rows) {

                const { Coords, EntityHandle } = n
                const color = stringToColour(EntityHandle)
                const points = [], fpoints = []

                const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2, linecap: 'round', linejoin: 'round' })

                if (this.Maptalks) {

                    for (const x of Coords) if (is(x)) {
                        const ll = UTM.convertUtmToLatLng(x[0], x[1], "48", "T")
                        const arg: any = { x: Number(ll.lng), y: Number(ll.lat), z: 0 }
                        const f = this.Maptalks.threeLayer.coordinateToVector3(arg, 0)
                        fpoints.push(new THREE.Vector3(f.x, f.y, is_3D_enabled ? this.altitude(x[2] - is_3D_diff) : 0))
                    }
                    const fgeometry = new THREE.BufferGeometry().setFromPoints(fpoints)
                    const fline = new THREE.Line(fgeometry, material)
                    fline.computeLineDistances()
                    group.add(fline)

                }

            }

        } catch (err: any) { log.error(`[LineString.add()]: ${err.message}`) }
    }

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

    insert = (key: string, rows: tItem[]) => {

        if (this.obj.hasOwnProperty(key)) this.remove(key)
        else {

            const group = new THREE.Group()
            this.obj[key] = group
            this.add(group, rows)
            this.Maptalks?.threeLayer.addMesh(group)

        }

    }

}