
export const handler = (e: any, state: any = undefined) => {

    const result: {
        loading: boolean,
        payload: any | null,
        message: string | null,
    } = { loading: true, payload: null, message: null }

    if (e === null && typeof state !== 'undefined') {
        state(result)
        return result
    }

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