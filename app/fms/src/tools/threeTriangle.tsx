import { THREE, ThreeView } from 'uweb/three'
import { MapView } from 'uweb/maptalks'
import { log, KeyValue } from 'utils/web'
import { Point, UTM } from 'uweb/utils'

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

    altitude = (el: number) => {
        const elevation = el || 1500
        const vector3 = this.Maptalks?.threeLayer.distanceToVector3(elevation, elevation)
        const zPos = vector3.x
        return zPos
    }

    add2 = (group: any, rows: tItem[]) => {
        try {
            const is_3D_enabled = KeyValue('3D') === 'yes'
            const is_3D_diff = Number(KeyValue('Elevation'))
            const is = (m: any[]) => !isNaN(m[0]) && !isNaN(m[1]) && !isNaN(m[2])

            // ── 1. Base unit triangle: P0=(0,0,0)  P1=(1,0,0)  P2=(0,1,0)
            const baseGeometry = new THREE.BufferGeometry()
            baseGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
                0, 0, 0,
                1, 0, 0,
                0, 1, 0,
            ], 3))
            baseGeometry.setAttribute('normal', new THREE.Float32BufferAttribute([
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
            ], 3))

            const material = new THREE.MeshBasicMaterial({
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.25,
                color: 'orange',
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -4,
            })

            // ── 2. Create InstancedMesh with row count
            const mesh = new THREE.InstancedMesh(baseGeometry, material, rows.length)
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

            const matrix = new THREE.Matrix4()
            let count = 0   // track valid instances (some rows may be skipped)

            // ── 3. One matrix per triangle
            for (const n of rows) {
                const j: [number, number, number][] = []

                for (const x of n.Coords[0]) {
                    if (!is(x)) continue
                    const ll = UTM.convertUtmToLatLng(x[0], x[1], '48', 'T')
                    const arg: any = { x: Number(ll.lng), y: Number(ll.lat), z: 0 }
                    const f = this.Maptalks?.threeLayer.coordinateToVector3(arg, 0)
                    j.push([f.x, f.y, is_3D_enabled ? this.altitude(x[2] - is_3D_diff) : 0])
                }

                if (j.length < 3) continue   // guard — skip degenerate row

                const A = new THREE.Vector3(...j[0])
                const B = new THREE.Vector3(...j[1])
                const C = new THREE.Vector3(...j[2])

                const col0 = new THREE.Vector3().subVectors(B, A)
                const col1 = new THREE.Vector3().subVectors(C, A)
                const col2 = new THREE.Vector3().crossVectors(col0, col1).normalize()

                matrix.set(
                    col0.x, col1.x, col2.x, A.x,
                    col0.y, col1.y, col2.y, A.y,
                    col0.z, col1.z, col2.z, A.z,
                    0, 0, 0, 1,
                )

                mesh.setMatrixAt(count++, matrix)
            }

            // ── 4. Commit
            mesh.count = count   // real instance count after skipped rows
            mesh.instanceMatrix.needsUpdate = true
            group.add(mesh)

        } catch (err: any) { log.error(`[Triangle.add()]: ${err.message}`) }
    }

    add = (group: any, rows: tItem[]) => {
        try {

            let is_3D_enabled = KeyValue('3D') === 'yes'
            let is_3D_diff = Number(KeyValue('Elevation'))

            const geometry = new THREE.BufferGeometry()
            const positions = []
            const normals = []

            const is = (m: any[]) => isNaN(m[0]) || isNaN(m[1]) || isNaN(m[2]) ? false : true
            const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3()
            const ab = new THREE.Vector3(), bb = new THREE.Vector3(), cb = new THREE.Vector3()

            for (const n of rows) {

                // const j = n.Coords[0]
                let j: any = []

                for (const x of n.Coords[0]) if (is(x)) {

                    const ll = UTM.convertUtmToLatLng(x[0], x[1], "48", "T")
                    const arg: any = { x: Number(ll.lng), y: Number(ll.lat), z: 0 }
                    const f = this.Maptalks?.threeLayer.coordinateToVector3(arg, 0)
                    j.push([f.x, f.y, is_3D_enabled ? this.altitude(x[2] - is_3D_diff) : 0])

                }

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
            this.add2(group, rows)
            this.Maptalks?.threeLayer.addMesh(group)

        }

    }

}