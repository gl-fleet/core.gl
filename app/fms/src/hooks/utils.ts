/** utilities **/

const { Pane } = require('tweakpane')
import type { ListApi } from 'tweakpane'

export class ListWithRemove {

    container: any;
    ul: any;
    onRemove: any;

    constructor(container: any, onRemove?: any) {

        this.container = typeof container === 'string' ? document.getElementById(container) : container
        if (!this.container) throw new Error('Container not found');
        this.onRemove = onRemove;
        this.ul = document.createElement('ul');
        this.ul.style.listStyle = 'none';
        this.ul.style.padding = '0';
        this.ul.style.margin = '4px 0';
        this.container.appendChild(this.ul);

    }

    clear() { this.ul.innerHTML = '' }

    addItem(text: any, cb: any = null) {

        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'space-between';
        li.style.fontSize = '11px';
        li.style.padding = '2px 4px 2px 12px';
        li.style.marginBottom = '2px';
        li.style.borderRadius = '4px';
        li.style.background = 'rgba(255,255,255,0.05)';

        const label = document.createElement('span');
        label.textContent = `👁 ${text}`;
        label.style.flex = '1';
        label.style.color = '#52C41A';

        const btn = document.createElement('button');
        btn.textContent = '×';
        btn.style.border = 'none';
        btn.style.background = 'transparent';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '11px';
        btn.style.color = '#888';

        btn.onclick = () => {
            cb && cb(text);
            li.remove();
            if (this.onRemove) this.onRemove(text);
        };

        li.appendChild(label);
        li.appendChild(btn);
        this.ul.appendChild(li);

    }

}

export const createPane = (title = '...', cb: any) => {

    const _obj: any = {}
    const _lst: any = {}
    const _btn: any = {}
    const _pane = new Pane({
        container: document.getElementById('pane') || undefined,
        theme: 'light', // or 'light'
    })

    const _tab = _pane.addFolder({ title, expanded: false, disabled: true })
    const _dispose = () => { cb('close', null); _tab.dispose(); _pane.dispose(); }

    const on = (k: string, v: any = null) => {

        if (_obj.hasOwnProperty(k)) { }
        _obj[k] = v

        k === 'close' && _dispose()
        if (k === 'effect') {

            if (v && v.hasOwnProperty('name') && v.hasOwnProperty('options')) {

                if (_lst[v.name]) _lst[v.name].dispose()
                _lst[v.name] = _pane.addFolder({ title: v.title ?? v.name, expanded: true, disabled: false })
                _lst[v.name].addInput({ [v.name]: '---' }, v.name, { options: v.options })

            } else {
                _pane.refresh()
            }

        }
        if (k === 'enable') {
            _tab.disabled = false
        }
        if (k === 'title') _tab.title = v
        if (k === 'btn') {

            if (v.hasOwnProperty('disabled')) _btn[v.name].disabled = v.disabled
            if (v.hasOwnProperty('title')) _btn[v.name].title = v.title

        }
        if (k === 'setup' && v) {

            for (const x in v) {

                if (x[0] !== '_' && x !== 'id' && x !== 'btn') {

                    if (v.hasOwnProperty(`_${x}`)) {

                        if (v[x] === null) v[x] = ''
                        const select: any = _tab.addInput(v, x, v[`_${x}`])
                        _lst[x] = select as ListApi<any>

                    } else {

                        if (v[x] === null) v[x] = ''
                        _lst[x] = _tab.addInput(v, x)

                    }

                }

            }

            if (v.btn) for (const b of v.btn) {

                _btn[b.title] = _tab.addButton({ label: '', title: b.title }).on('click', () => cb(b.title, { ...b }))

            }

            _pane.addButton({ label: '', title: '🗙' }).on('click', () => _dispose())
            _pane.on('change', ({ value }: any) => cb('change', { title, value }))
            _tab.expanded = true

            const container = document.createElement('div')
            container.id = 'tweak-files'
            _tab.element.appendChild(container)

        }

        return true

    }

    return on

}

export const testPane = () => {

    for (let i = 0; i < 2; i++) {

        const def = {
            toggle: false,
            color: '#fff',
            background: '#000',
            slide: 5,
            _slide: { min: 0, max: 10 },
        }

        const emit = createPane(`Pane-${i}`, (k: string, v: any = null) => {
            console.log(k, v)
            console.log(def)
        })

        emit(`setup`, def)
        emit(`clear`, {})
        emit(`Hello from ${i}`, {})

        setTimeout(() => {
            def.toggle = true
            def.slide = (i + 1)
            emit(`effect`, {})
        }, 1000 * (i + 1))

    }

    return null

}

export const handler = (e: any, state: any = undefined) => {

    const result: {
        loading: boolean,
        payload: any | null,
        message: string | null,
    } = { loading: true, payload: null, message: null }

    const res = () => {
        result.payload = e ?? null
    }

    const rej = () => {

        if (e.hasOwnProperty('response')) {

            result.message = e.response.data ?? e.message

        } else {

            result.message = e.message ?? 'Unknown error'

        }

    }

    if (e === null && typeof state !== 'undefined') {
        state(result)
        return result
    }

    if (typeof e !== 'undefined') {

        if (typeof e === 'object' && e.hasOwnProperty('code')) rej()
        else res()

    }

    result.loading = false

    if (typeof state !== 'undefined') {
        state(result)
    }

    return result

}

const convertToCSV = (objArray: any) => {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';

    for (var i = 0; i < array.length; i++) {
        var line = '';
        for (var index in array[i]) {
            if (line != '') line += ','

            line += array[i][index];
        }

        str += line + '\r\n';
    }

    return str;
}

export const exportCSVFile = (headers: any, items: any, fileTitle: string) => {
    if (headers) items.unshift(headers)
    // Convert Object to JSON
    var jsonObject = JSON.stringify(items)
    var csv = convertToCSV(jsonObject)
    var exportedFilenmae = fileTitle + '.csv' || 'export.csv'
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const nav: any = window.navigator
    if (nav.msSaveBlob) { // IE 10+
        nav.msSaveBlob(blob, exportedFilenmae);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", exportedFilenmae);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

export const getUTMZone = (lat: number, lon: number) => {

    // Calculate UTM Zone Number
    const zoneNumber = Math.floor((lon + 180) / 6) + 1
    // Calculate UTM Zone Letter
    const letters = "CDEFGHJKLMNPQRSTUVWX" // UTM zone letters (I and O are skipped)
    let zoneLetter = ''
    if (lat >= -80 && lat <= 84) zoneLetter = letters[Math.floor((lat + 80) / 8)]
    else zoneLetter = 'Z' // Outside UTM limits
    return { zoneNumber, zoneLetter }

}