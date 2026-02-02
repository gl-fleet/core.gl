import { React, Select, Typography, Button, message } from 'uweb'
import { createGlobalStyle } from 'styled-components'
const { useEffect, useState, useRef } = React

const Style = createGlobalStyle``

export default (cfg: iArgs) => {

    const [loading, setLoading] = useState(0)
    const [vehicles, setVehicles] = useState([])

    const searchRef: any = React.createRef()

    useEffect(() => {

        const doc: any = document
        const elem = doc.getElementById('render_0')
        const input: any = doc.querySelector('#header input')

        if (elem && input) elem.onclick = (e: any) => { input.blur() }

    }, [])

    const onDropdownChanges = (e: boolean) => {

        if (e) {

            setLoading(1)

            cfg.core_collect.get("get-enums", { type: 'location.now' }).then((ls: any) => {

                const obj: any = {}
                const arr: any = []

                for (const x of ls) {

                    const parsed = JSON.parse(x.value)
                    if (!obj.hasOwnProperty(parsed.type)) obj[parsed.type] = []
                    obj[parsed.type].push(parsed)

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

                setLoading(0)
                setVehicles(arr)

            }).catch(() => setLoading(2))

        }

    }

    return <div id='header'>
        <Style />
        <Select
            ref={searchRef}
            size='small'
            style={{
                margin: 'auto',
                fontSize: 10,
                width: 180,
                zIndex: 10,
            }}
            notFoundContent={null}
            loading={loading === 1}
            status={loading === 2 ? 'error' : undefined}
            showSearch={true}
            placeholder={loading === 2 ? "Connection error" : "Select a vehicle"}
            onOpenChange={onDropdownChanges}
            options={vehicles}
            filterOption={(input: any, option: any) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
            onSelect={(n, { data }: any) => {

                const [_g, _g1, _g2, _gps, _gsm, _rtcm, _val] = data.data.split('|')
                const g = _g.split(',')
                const gps = [Number(g[0]), Number(g[1]), 0]
                cfg.MapView?.animateTo([gps[0], gps[1]], 0)

            }}
        />
    </div>

}