import { React, Select, Typography, Button, message } from 'uweb'
import { UTM } from 'uweb/utils'
import { createGlobalStyle } from 'styled-components'
import { Connection } from 'unet/web'

const { Text, Link } = Typography
const { useEffect, useState, useRef } = React

const Style = createGlobalStyle``

export default (cfg: iArgs | any) => {

    const [loading, setLoading] = useState(true)
    const [vehicles, setVehicles] = useState([])

    useEffect(() => {

        const ls = cfg.equipments
        if (ls.length > 0) {

            setLoading(false)

            const obj: any = {}
            const arr: any = []

            for (const x of ls) {
                if (!obj.hasOwnProperty(x.type)) obj[x.type] = []
                obj[x.type].push(x)
            }

            for (const x in obj) {

                let s: any = {
                    label: <span style={{ textTransform: 'capitalize' }}>{x}</span>,
                    title: x,
                    options: [],
                }

                for (const n of obj[x]) {
                    s.options.push({
                        value: n.name,
                        label: <div>
                            <span style={{ textTransform: 'uppercase' }}>{`${n.name}`}</span>
                            {' '}
                            <span style={{ textTransform: 'capitalize' }}>({n.proj})</span>
                        </div>,
                        data: n,
                    })
                }

                arr.push(s)

            }

            setVehicles(arr)

        }

    }, [cfg.equipments])

    const onDropdownChanges = (e: boolean) => { }

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
            loading={loading}
            showSearch={true}
            placeholder="Select a vehicle"
            onDropdownVisibleChange={onDropdownChanges}
            filterOption={(input: any, option: any) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
            onSelect={(n, { data }) => {

                const { east: x, north: y } = data
                const { lat, lng } = UTM.convertUtmToLatLng(x, y, "48", "T")
                cfg.Maptalks.animateTo([lng, lat], 2)

            }}
            options={vehicles}
        />
    </>

}