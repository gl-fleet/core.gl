import { THREE, ThreeView } from 'uweb/three'
import { MapView } from 'uweb/maptalks'
import { log } from 'utils/web'
import { Point } from 'uweb/utils'

export class Triangle {

    isM = false
    Three
    Maptalks
    Point

    obj: any = {}

    constructor({ Maptalks, Three }: { Maptalks?: MapView, Three?: ThreeView }) {

        this.Maptalks = Maptalks
        this.Three = Three
        if (Maptalks && Three) this.Point = new Point({ Maptalks, Three })

    }

    add = (group: any, rows: tItem[]) => {
        try {

            const geometry = new THREE.BufferGeometry()
            const positions = []
            const normals = []

            const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3()
            const ab = new THREE.Vector3(), bb = new THREE.Vector3(), cb = new THREE.Vector3()

            for (const n of rows) {

                const j = n.Coords[0]
                const ax = j[0][0], ay = j[0][1], az = j[0][2]
                const bx = j[1][0], by = j[1][1], bz = j[1][2]
                const cx = j[2][0], cy = j[2][1], cz = j[2][2]

                positions.push(ax, ay, az)
                positions.push(bx, by, bz)
                positions.push(cx, cy, cz)

                pA.set(ax, ay, az)
                pB.set(bx, by, bz)
                pC.set(cx, cy, cz)

                cb.subVectors(pC, pB)
                ab.subVectors(pA, pB)
                cb.cross(ab)

                cb.normalize()

                const nx = cb.x
                const ny = cb.y
                const nz = cb.z

                normals.push(nx, ny, nz)
                normals.push(nx, ny, nz)
                normals.push(nx, ny, nz)

            }

            const disposeArray = () => { }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).onUpload(disposeArray))
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3).onUpload(disposeArray))
            geometry.computeBoundingSphere()

            const material = new THREE.MeshLambertMaterial({
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5,
                color: "orange",
            })

            group.add(new THREE.Mesh(geometry, material))

        } catch (err: any) { log.error(`[Triangle.add()]: ${err.message}`) }
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