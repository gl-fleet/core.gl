
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