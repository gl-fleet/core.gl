import { React, Modal, Input } from 'uweb'
import { SafetyCertificateOutlined } from '@ant-design/icons'
import { createGlobalStyle } from 'styled-components'
import { Connection } from 'unet/web'
import { KeyValue } from 'utils/web'

const { useRef, useEffect, useState } = React

const Style = createGlobalStyle`

    html, body {
        width: 100% !important;
    }

    #auth-pop {
        border-radius: 8px;
    }

`

export default (cfg: iArgs) => {

    const proxy: { current: Connection } = useRef(new Connection({ name: 'core_proxy' }))
    const token: any = useRef()
    const [open, setOpen] = useState(true)
    const [loading, setLoading] = useState(false)

    const signIn = () => {

        console.log(token.current)
        const jwt = String(token.current)
        setLoading(true)
        proxy.current.get('verify', { token: jwt })
            .then(e => { console.log(e) })
            .catch(e => { console.log(e) })
            .finally(() => { setLoading(false) })

    }

    useEffect(() => {

        const { event } = cfg

        event.on('sign-in', () => { })
        event.on('sign-out', () => { })

    }, [])

    return <div>

        <Modal confirmLoading={loading} centered title="Sign-In" open={open} onOk={() => signIn()} onCancel={() => setOpen(false)} destroyOnClose={true}>

            <Style />

            <Input
                placeholder="Enter your token"
                onChange={({ target: { value } }) => { token.current = value }}
                suffix={<SafetyCertificateOutlined className="site-form-item-icon" />}
                onPressEnter={() => signIn()}
            />

        </Modal>

    </div>

}