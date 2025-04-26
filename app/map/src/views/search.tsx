import { React, Select, Typography, Button, message } from 'uweb'
import { UTM } from 'uweb/utils'
import { createGlobalStyle } from 'styled-components'

const { useEffect, useState, useRef } = React

const Style = createGlobalStyle``

export default (cfg: iArgs) => {

    const [loading, setLoading] = useState(false)
    const [vehicles, setVehicles] = useState([])

    useEffect(() => {

        const obj: any = {}

        const aggregate = (alias = '') => {

            const arr: any = []

            for (const _type in obj) {

                let s: any = {
                    label: <span style={{ textTransform: 'capitalize' }}>{_type}</span>,
                    title: _type,
                    options: [],
                }

                for (const _name in obj[_type]) {

                    const arg = obj[_type][_name]

                    s.options.push({
                        value: _name,
                        label: <div>
                            <span style={{ textTransform: 'uppercase' }}>{`${_name}`}</span>
                            {' '}
                            <span style={{ textTransform: 'capitalize' }}>({arg.proj})</span>
                        </div>,
                        data: arg,
                    })

                }

                arr.push(s)

            }

            setVehicles(arr)

        }

        const initial = (arg: any) => {

            if (!obj.hasOwnProperty(arg.type)) obj[arg.type] = {}
            if (!obj[arg.type].hasOwnProperty(arg.name)) obj[arg.type][arg.name] = {
                proj: arg.project,
                east: arg.utm[0],
                north: arg.utm[1],
            }

            aggregate('initial')

        }

        const update = (arg: any) => {

            if (!obj.hasOwnProperty(arg.type)) obj[arg.type] = {}
            if (!obj[arg.type].hasOwnProperty(arg.name)) obj[arg.type][arg.name] = {
                proj: arg.proj,
                east: arg.east,
                north: arg.north,
            }

            aggregate('update')

        }

        cfg.event.on('location-initial', initial)
        cfg.event.on('location-update', update)

        return () => {
            cfg.event.off('location-initial', initial)
            cfg.event.off('location-update', update)
        }

    }, [])

    return <>
        <Style />
        <Select
            style={{
                position: 'fixed',
                top: 24,
                left: 0,
                right: 0,
                margin: 'auto',
                width: 180,
                zIndex: 10,
            }}
            disabled={vehicles.length === 0}
            loading={loading}
            showSearch={true}
            options={vehicles}
            placeholder="Select a vehicle"
            // onDropdownVisibleChange={onDropdownChanges}
            filterOption={(input: any, option: any) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
            onSelect={(n, { data }) => {

                const { east: x, north: y } = data
                const { lat, lng } = UTM.convertUtmToLatLng(x, y, "48", "T")
                cfg.MapView?.animateTo([lng, lat], 2)

            }}
        />
    </>

}