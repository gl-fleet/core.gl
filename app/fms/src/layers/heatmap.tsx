import { React, Row, Col } from 'uweb'
import { AsyncWait, Safe, dateFormat } from 'utils/web'
import { THREE } from 'uweb/three'
import moment from 'moment'

const { useEffect, useState, useRef } = React

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

    useEffect(() => {

        cfg.event.on('layer.geofences', (id = null) => setOn((v) => !v))

    }, [])

    useEffect(() => {

        if (cfg.Pane) {

            if (on === false) {

                folder.current && folder.current.dispose()
                if (group.current) remMesh(group.current)

            } else {

                folder.current = cfg.Pane.addTab({
                    pages: [
                        { title: 'Polygon' },
                        { title: 'Line' },
                        { title: 'Shape' }
                    ]
                })

                const polygon = {
                    Name: '',
                    Color: '#f05',
                    Thick: 1,
                    Bezier: 1
                }

                folder.current.pages[0].addBinding(polygon, 'Name')
                folder.current.pages[0].addBinding(polygon, 'Color')
                folder.current.pages[0].addBinding(polygon, 'Thick', { step: 1, min: 1, max: 10 })
                folder.current.pages[0].addBinding(polygon, 'Bezier', { step: 1, min: 1, max: 10 })

                folder.current.pages[0].addButton({ title: 'Save' }).on('click', () => {
                    console.log('Save Plygon')
                })

            }

        }

    }, [on])

    return null

}