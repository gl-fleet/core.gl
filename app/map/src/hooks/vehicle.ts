import { Vehicle, Toyota, Drill, Dozer, Exca, Dump, Truck } from 'uweb/utils'
import { MapView, maptalks } from 'uweb/maptalks'
import { log } from 'utils/web'

export const getVehicle = (Maptalks: MapView, type: string): Promise<Vehicle> => new Promise((resolve, reject) => {

    log.info(`[Vehicles] -> Get Vehicle / ${type} [LOAD]`)

    const fps = 60
    const buffer = true

    type === 'vehicle' && Toyota({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks, fps, buffer })))
        .catch((err) => reject(err))

    type === 'drill' && Drill({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks, fps, buffer })))
        .catch((err) => reject(err))

    type === 'dozer' && Dozer({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks, fps, buffer })))
        .catch((err) => reject(err))

    type === 'exca' && Exca({ size: 0.8, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks, fps, buffer })))
        .catch((err) => reject(err))

    type === 'dump' && Dump({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks, fps, buffer })))
        .catch((err) => reject(err))

    type === 'truck' && Truck({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks, fps, buffer })))
        .catch((err) => reject(err))

})

export class Vehicles {

    public obj: any = {}
    public list: any = []
    public layer
    public maptalks
    public cfg = {
        last_update: 0,
        is_loading: false,
    }
    public state: any = {}

    constructor(Maptalks: MapView) {

        this.maptalks = Maptalks
        this.layer = new maptalks.VectorLayer('vector', { enableAltitude: true }).addTo(this.maptalks.map)

        setInterval(() => {

            for (const x in this.state) {

                const _marker = this.obj[x]?.marker
                const _vehicle = this.obj[x]?.vehicle
                const updated_at = this.state[x].updated_at ?? 0

                if (updated_at <= 1) {

                    _vehicle.setColor('#000')
                    _marker.updateSymbol({ textFill: '#fff', textHaloFill: '#000' })

                } else if ((Date.now() - updated_at) > 15000) {

                    _vehicle.setColor('#FF0000')
                    _marker.updateSymbol({ textFill: '#fff', textHaloFill: '#FF0000' })

                } else {

                    _vehicle.setColor('#00FF00')
                    _marker.updateSymbol({ textFill: '#fff', textHaloFill: '#00FF00' })

                }

            }

        }, 1000)

    }

    open_window = (key: string, { project, type, name }: any) => {

        const width = screen.width, height = screen.height, popw = 720, poph = 720 + 27
        window.open(`/core_info/?view=vehicle&key=${type}&project=${project}&type=${type}&name=${name}`, type, `top=${(height / 2) - (poph / 2) - 24},left=${window.screenX + (width / 2) - (popw / 2)},width=${popw},height=${poph}`)

    }

    update_vehicle = (key: string, loc: any) => {

        const t = this.obj[key]?.vehicle
        if (typeof t !== 'undefined') t.update(loc)

    }

    update_marker = (key: string, { name, gps, activity }: any) => {

        const t = this.obj[key]?.marker

        if (typeof t !== 'undefined') {

            /* let color = '#000'
            color = activity.indexOf('speed') !== -1 ? 'blue' : color
            color = activity.indexOf('moving') !== -1 ? 'green' : color
            color = activity.indexOf('stopped') !== -1 ? 'orange' : color */

            t.setCoordinates(gps)
            t.setProperties({ name: name, altitude: 12 })
            // t.updateSymbol({ textFill: '#fff', textHaloFill: color })

        }

    }

    create_vehicle = (key: string, { project, type, name }: any, body: any) => {

        const proc = (e: any) => {

            this.obj[key].vehicle = e

            e.animate("Take 001", { loop: true, speed: 0.5 })

            this.state[key] = {
                updated_at: 0,
                activity: body.activity,
            }

            e.on((ename: string, arg: any) => {

                ename === 'mouse' && arg === 'dblclick' && this.open_window(key, { project, type, name })

                if (ename === 'position-map' && arg.gps && arg.gps.x) {

                    this.update_marker(key, { ...body, gps: [arg.gps.x, arg.gps.y, arg.gps.z] })
                    this.state[key].updated_at = this.state[key].updated_at === 0 ? 1 : Date.now()

                }

            })

            this.update_vehicle(key, body)

        }

        getVehicle(this.maptalks, type).then(proc).catch(e => { }).finally(() => {
            this.cfg.is_loading = false
        })

    }

    create_marker = (key: string, { project, type, name }: any) => {

        const marker = new maptalks.Marker([0, 0], {
            'properties': { 'name': name, 'altitude': 50 },
            'symbol': <any>{
                'textFaceName': 'sans-serif',
                'textName': '{name}',
                'textWeight': 'bold', //'bold', 'bolder'
                'textStyle': 'normal', //'italic', 'oblique'
                'cursor': 'pointer',
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

        this.obj[key].marker = marker

        if (screen.width > 640) marker.on('dblclick', () => this.open_window(key, { project, type, name }))
        else marker.on('click', () => this.open_window(key, { project, type, name }))

        // Loop(() => (Date.now() - this.cfg.last_update >= 5000) && marker.updateSymbol({ textFill: '#fff', textHaloFill: 'red' }), 2500)

    }

    live_update = (body: any) => {

        const { project, type, name } = body
        const key = `${project}_${type}_${name}`
        const exists = this.obj.hasOwnProperty(key)

        if (!exists) {

            this.obj[key] = {}
            this.create_vehicle(key, { project, type, name }, body)
            this.create_marker(key, { project, type, name })

        }

        this.update_vehicle(key, body)
        // this.update_marker(key, body)

        this.cfg.last_update = Date.now()

    }

}