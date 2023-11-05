import { React, Layout, Row, Col, Table, Space, Upload, Typography, Input, Button, message, Select, Popconfirm, Grid } from 'uweb'
import { UploadOutlined, FolderOutlined, RedoOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { createGlobalStyle } from 'styled-components'
import { log, Delay, Safe } from 'utils/web'
import ReactJson from 'react-json-view'

const { useEffect, useState, useRef } = React
const { Title, Text } = Typography
const { useBreakpoint } = Grid

const Style = createGlobalStyle`
    #root > div {
        height: fit-content !important;
        min-height: 100% !important;
    }
    #root .ant-float-btn-group {
        display: none;
    }
    .ant-upload-drag {
        height: 140px !important;
    }
    .react-json-view {
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 16px;
    }
    .ant-upload-select {
        width: 100% !important;
    }
    .ant-upload-list {
        position: fixed;
        left: 8px;
        bottom: 8px;
    }
`

export default (cfg: iArgs) => {

    const [loading, setLoading] = useState(false)
    const [list, setList] = useState({ loading: false, data: [] })
    const [json, setJson] = useState({})
    const [type, setType] = useState('')
    const fileRef: any = useRef()
    const screens = useBreakpoint()
    const name = cfg.name

    useEffect(() => fileList(), [])

    const fileList = () => setList(() => {

        cfg.api.poll('get-chunks-distinct', { dst: cfg.name }, (e: any, data: []) => setList({ loading: false, data: data ?? [] }))
        return { loading: true, data: [] }

    })

    const fileDelete = (args: any) => {
        console.log('delete', args)
        cfg.api.set('del-chunks', { type: args.type, name: args.name, dst: args.dst })
            .then((e) => message.success(`${e ?? 'Success'}`))
            .catch((e) => message.error(e.message))
            .finally(() => fileList())
    }

    const props = {
        name: 'file',
        multiple: false,
        action: `${window.location.origin}/core_data/${type}`,
        onChange: (info: any) => {

            const { status } = info.file

            if (status !== 'uploading') {
                console.log('Uploading', info.file, info.fileList)
            }
            if (status === 'done') {
                setJson(info.file.response)
                message.success(`${info.file.name} file uploaded successfully.`)
            }
            if (status === 'error') {
                message.error(`${info.file.name} file upload failed.`)
            }

        },
        onDrop: (e: any) => {
            console.log('Dropped files', e.dataTransfer.files)
        },
    }

    const save = () => {

        try {

            log.info(`File name: ${fileRef.current.input.value}`)
            log.info(`File type: ${type}`)
            log.info(`Equipment name: ${name}`)
            log.info(`GeoJSON: ${json}`)

            const success = () => {
                fileRef.current.input.value = ""
                setJson({})
                message.success('Success!')
            }

            const payload = {
                name: String(fileRef.current.input.value),
                dst: name,
                type: type,
                data: json,
            }

            if (payload.name.length <= 2) {
                message.warning(`Please enter file name!`)
                return
            }

            if (payload.dst.length <= 2) {
                message.warning(`Please enter equipment name!`)
                return
            }

            if (Object.keys(payload.data).length === 0) {
                message.warning(`No file detected!`)
                return
            }

            setLoading(true)
            cfg.api.set('set-chunks', payload)
                .then(e => success())
                .catch(e => { message.error('Please try again!') })
                .finally(() => setLoading(false))

        } catch (err: any) { message.error(`${err.message}`) }

    }

    const columns: any = [
        {
            title: '',
            render: () => <Text style={{ display: 'block', textAlign: 'center' }}><FolderOutlined /></Text>
        },
        {
            title: 'Name',
            dataIndex: 'name',
            render: (e: string) => <Text>{e}</Text>
        },
        {
            title: 'Type',
            dataIndex: 'type',
            render: (e: string) => <Text>{e}</Text>
        },
        {
            title: 'Chunks',
            dataIndex: 'count',
            hidden: screens.xs,
            render: (e: string) => <Text>{e}</Text>,
        },
        {
            title: 'From',
            dataIndex: 'src',
            hidden: screens.xs,
            render: (e: string) => <Text>{e}</Text>
        },
        {
            title: 'To',
            dataIndex: 'dst',
            hidden: screens.xs,
            render: (e: string) => <Text>{e}</Text>
        },
        {
            title: '',
            render: (arg: any) => {

                return <center>
                    <Popconfirm
                        title={`Delete the ${arg.name}`}
                        description="Are you sure to delete this file?"
                        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                        onConfirm={() => fileDelete(arg)}
                    >
                        <Button type="link" icon={<DeleteOutlined />} size='small' />
                    </Popconfirm>
                </center>
            }
        }
    ].filter(item => !item.hidden)

    return <div style={{ padding: 16 }}>
        <Row gutter={[16, 16]} id="main">

            <Style />

            <Col span={24}>
                <div style={{ position: 'relative' }}>
                    <Button onClick={() => fileList()} style={{ position: 'absolute', right: -12, top: -12, zIndex: 1 }} shape="circle" icon={<RedoOutlined />} size={'small'} />
                    <Table rowKey={'name'} loading={list.loading} dataSource={list.data ?? []} columns={columns} size={'small'} pagination={{ pageSize: 4 }} />
                </div>
            </Col>

            <Col span={24}>
                <ReactJson
                    iconStyle="square"
                    src={json}
                    theme={cfg.isDarkMode ? "twilight" : "bright:inverted"}
                    collapsed={true}
                />
            </Col>

            <Col xs={24} sm={12} span={12}>
                <Space.Compact style={{ width: '100%' }}>
                    <Select
                        style={{ width: '100%' }}
                        placeholder="Select a type"
                        onChange={(e) => setType(e)}
                        options={[
                            { value: 'dxf-geojson', label: 'Dig Plan as DXF' },
                            { value: 'csv-geojson', label: 'Shot Plan as CSV' },
                            { value: 'json-upload', label: 'GeoJSON file' },
                        ]}
                    />
                    <Upload {...props} style={{ width: '100%', display: 'block' }}>
                        <Button style={{ display: 'block', width: '100%' }} icon={<UploadOutlined />}>Click to Upload</Button>
                    </Upload>
                </Space.Compact>
            </Col>

            <Col xs={24} sm={12} span={12}>
                <Space.Compact style={{ width: '100%' }}>
                    <Input ref={fileRef} placeholder="File name" />
                    <Button loading={loading} type="primary" onClick={() => save()}>Save</Button>
                </Space.Compact>
            </Col>

        </Row>
    </div>

}