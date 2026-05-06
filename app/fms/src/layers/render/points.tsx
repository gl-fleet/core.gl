import { DXF_GeoJson_Parser } from '../../hooks/helper'
import { LineString } from '../../tools/threeLinestring'
import { Triangle } from '../../tools/threeTriangle'

export class Digs {

    cfg: iArgs
    line: LineString
    triangle: Triangle

    constructor(cfg: iArgs) {

        this.cfg = cfg
        this.line = new LineString({ Maptalks: cfg.MapView })
        this.triangle = new Triangle({ Maptalks: cfg.MapView })

    }

    remove = (key = '') => {

        this.triangle.remove(key)
        this.line.remove(key)

    }

    remove_all = () => {
        this.triangle.remove_all()
        this.line.remove_all()
    }

    render_plan = (key = '', name = '', dst = '') => new Promise<{}>((res) => {

        this.cfg.core_data.poll('get-chunks-merged', { name, dst }, (e: any, data: any = {}) => {

            if (e) { res({}) } else {

                const { polygons, linestrings } = DXF_GeoJson_Parser(data)

                this.triangle.insert(key, polygons)
                this.line.insert(key, linestrings)

                res({ polygons, linestrings })

            }

        })

    })

}