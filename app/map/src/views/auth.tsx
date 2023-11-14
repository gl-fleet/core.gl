import { React, Layout, Modal, Input, FloatButton, Descriptions } from 'uweb'
import { SafetyCertificateOutlined, LoginOutlined, LoadingOutlined, SafetyOutlined } from '@ant-design/icons'
import { createGlobalStyle } from 'styled-components'
import { handler } from '../hooks/utils'

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

    const { event, proxy, kv } = cfg

    const token: any = useRef(kv.get('token'))
    const [did, setDid] = useState(false)
    const [open, setOpen] = useState(false)
    const [sign, setSign] = useState<any>({ loading: false, payload: null, message: null })

    const signIn = () => {

        // log.info(`[SignIn] ${token.current}`)
        setSign(handler(null, setSign))
        proxy.get('verify', { token: String(token.current) })
            .then(e => { setSign(handler(e, setSign)) })
            .catch(e => { setSign(handler(e, setSign)) })

    }

    const signOut = () => {

        // log.info(`[SignIn] ${token.current}`)
        kv.set('token', '')
        setSign({ loading: false, payload: null, message: null })

    }

    useEffect(() => {

        event.on('sign-in', () => { })
        event.on('sign-out', () => { })

        token.current && signIn()
        setDid(true)

    }, [])

    useEffect(() => {

        sign.payload && kv.set('token', token.current)

    }, [sign.payload])

    if (!did) { return null }

    /* Sign(d)-In */
    if (sign.loading === false && sign.payload !== null) return <div>

        <Layout style={{ background: 'transparent', position: 'absolute', left: 16, top: 16, padding: 0, zIndex: 100 }}>
            <FloatButton.Group shape="circle" style={{ top: 24, zIndex: 10, height: 180 }}>
                <FloatButton type="primary" onClick={() => setOpen(true)} icon={<SafetyOutlined />} />
            </FloatButton.Group>
        </Layout>

        <Modal confirmLoading={sign.loading} centered title="Authentication" open={open} okText="Sign-Out" onOk={() => signOut()} onCancel={() => setOpen(false)} destroyOnClose={true}>

            <Style />

            <Descriptions layout="vertical" items={Object.keys(sign.payload).map(key => ({
                key: key,
                label: key,
                children: sign.payload[key]
            }))} />

        </Modal>

    </div>

    /* Sign(d)-Out */
    else return <div>

        <Layout style={{ background: 'transparent', position: 'absolute', left: 16, top: 16, padding: 0, zIndex: 100 }}>
            <FloatButton.Group shape="circle" style={{ top: 24, zIndex: 10, height: 180 }}>
                <FloatButton onClick={() => setOpen(true)} icon={sign.loading ? <LoadingOutlined /> : <LoginOutlined />} />
            </FloatButton.Group>
        </Layout>

        <Modal confirmLoading={sign.loading} centered title="Sign-In" open={open} onOk={() => signIn()} onCancel={() => setOpen(false)} destroyOnClose={true}>

            <Style />

            <Input
                status={sign.message ? 'warning' : ''}
                placeholder="Enter your token"
                onChange={({ target: { value } }) => { token.current = value }}
                suffix={<SafetyCertificateOutlined className="site-form-item-icon" />}
                onPressEnter={() => signIn()}
            />

        </Modal>

    </div>

}