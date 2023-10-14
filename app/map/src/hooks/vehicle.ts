import { Vehicle, Toyota } from 'uweb/utils'
import { MapView, maptalks } from 'uweb/maptalks'
import { Loop, log } from 'utils/web'

export const getVehicle = (Maptalks: MapView, type: string): Promise<Vehicle> => new Promise((resolve, reject) => {

    log.info(`[Vehicles] -> Get Vehicle / ${type}`)
    Toyota({ size: 55, x: 0, y: -100, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks })))
        .catch((err) => reject(err))

})

export class Vehicles {

    public obj: any = {}
    public list: any = []
    public layer
    public maptalks
    public cfg = {
        last_update: 0,
    }

    constructor(Maptalks: MapView) {

        this.maptalks = Maptalks
        this.layer = new maptalks.VectorLayer('vector', { enableAltitude: true }).addTo(this.maptalks.map)
        this.last_updates()

    }

    open_window = (type: string, name: string) => {

        const width = screen.width, height = screen.height, popw = 700, poph = 640
        window.open(`/core_file?type=${type}&name=${name}`, 'vehicle', `top=${(height / 2) - (poph / 2) - 24},left=${window.screenX + (width / 2) - (popw / 2)},width=${popw},height=${poph}`)

    }

    update_vehicle = (key: string, { data_gps }: any) => {

        const t = this.obj[key]?.vehicle
        if (typeof t !== 'undefined') {
            t.update({ ...data_gps })
        }

    }

    create_vehicle = (key: string, type: string) => {

        const proc = (e: any) => {

            this.obj[key].vehicle = e
            e.on((name: string, arg: any) => {
                name === 'mouse' && arg === 'dblclick' && this.open_window(key, type)
            })

        }

        getVehicle(this.maptalks, type)
            .then(proc).catch(e => { })

    }

    update_marker = (key: string, { name, data_gps, data_activity }: any) => {

        const t = this.obj[key]?.marker

        if (typeof t !== 'undefined') {

            let color = '#000'
            color = data_activity.state.indexOf('speed') !== -1 ? 'blue' : color
            color = data_activity.state.indexOf('moving') !== -1 ? 'green' : color
            color = data_activity.state.indexOf('stopped') !== -1 ? 'orange' : color

            t.setCoordinates(data_gps.gps)
            t.setProperties({ name: name, altitude: 12 })
            t.updateSymbol({ textFill: '#fff', textHaloFill: color })

        }

    }

    create_marker = (key: string, type: string) => {

        this.obj[key].marker = new maptalks.Marker([0, 0], {
            'properties': { 'name': 'SV101', 'altitude': 50 },
            'symbol': {
                'textFaceName': 'sans-serif',
                'textName': '{name}',
                'textWeight': 'bold', //'bold', 'bolder'
                'textStyle': 'normal', //'italic', 'oblique'
                'textSize': 12,
                'textFont': null,     //same as CanvasRenderingContext2D.font, override textName, textWeight and textStyle
                'textFill': '#fff',
                'textOpacity': 1,
                'textHaloFill': '#000',
                'textHaloRadius': 1,
                'textHorizontalAlignment': 'middle', //left | middle | right | auto
                'textVerticalAlignment': 'middle',   // top | middle | bottom | auto
                'textAlign': 'center', //left | right | center | auto
            }
        }).addTo(this.layer)

        const t = this.obj[key].marker

        t.on('mouseenter', () => {
            log.warn(`Double click on MARKER!`)
        })

        Loop(() => {
            (Date.now() - this.cfg.last_update >= 10000) && t.updateSymbol({ textFill: '#fff', textHaloFill: 'red' })
        }, 2500)

    }

    last_updates = () => {
        // Print last location of vehicles
    }

    live_update = (body: any) => {

        const { project, type, name, data_activity, data_gps } = body
        const key = `${project}_${type}_${name}`
        const exists = this.obj.hasOwnProperty(key)

        if (!exists) {
            this.obj[key] = {}
            this.create_vehicle(key, type)
            this.create_marker(key, type)
        }

        this.update_vehicle(key, body)
        this.update_marker(key, body)

        this.cfg.last_update = Date.now()

    }

}