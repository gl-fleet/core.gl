import { React, Tabs, Alert } from 'uweb'

const { useEffect } = React

const onChange = (key: string) => {
    console.log(key)
}

const items = [
    {
        key: '1',
        label: 'NTRIP',
        children: <Alert message="Permission denied!" type="warning" showIcon closable />,
    },
    {
        key: '2',
        label: 'Replication',
        children: <Alert message="Permission denied!" type="warning" showIcon closable />,
    },
    {
        key: '3',
        label: 'Execute',
        children: <Alert message="Permission denied!" type="warning" showIcon closable />,
    },
]

export default ({ event }: iArgs) => {

    useEffect(() => { }, [])

    return <Tabs defaultActiveKey="1" items={items} onChange={onChange} />

}