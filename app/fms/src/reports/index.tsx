import { React, Modal } from 'uweb'
const { useEffect, useState, useRef } = React
import DrillReport from './drill'
import DrillReportChat from './drillReportChat'

export default (cfg: iArgs) => {
    const [open, setOpen] = useState(false)
    const [data, setData]: any = useState({})

    // Refs to DrillReport's export functions — set by DrillReport via callback
    const actionsRef = useRef<{ printPDF: () => void; downloadCSV: () => void } | null>(null)

    useEffect(() => {
        cfg.event.on('report', ({ name, data }: any) => {
            console.log(name, data)
            setData(data)
            setOpen(true)
        })
    }, [])

    const handleCommand = (action: string, params: any) => {
        if (!actionsRef.current) return
        if (action === 'generate_pdf') actionsRef.current.printPDF()
        if (action === 'generate_csv') actionsRef.current.downloadCSV()
    }

    return (
        <Modal
            open={open}
            onCancel={() => setOpen(false)}
            width="min(900px, 95vw)"
            footer={null}
            style={{ top: 40 }}
            styles={{
                body: { background: '#0d1017', padding: '20px 24px', maxHeight: '85vh', overflowY: 'auto' },
                content: { padding: 0 }
            }}
            closeIcon={
                <span style={{
                    fontSize: 12, color: '#666', fontWeight: 700,
                    lineHeight: 1, fontFamily: 'monospace',
                }}>✕</span>
            }
        >
            <DrillReport
                data={data.status}
                shots={data.shots}
                onReady={(actions: any) => { actionsRef.current = actions }}
            />
            <DrillReportChat
                cfg={cfg}
                data={data.status}
                shots={data.shots}
                onCommand={handleCommand}
            />
        </Modal >
    )
}