import jwt from 'jsonwebtoken'
import { Core, Host } from 'unet'
import { dateFormat, moment, Run, decodeENV, Sfy, log } from 'utils'
import { Manage } from './pm2'

const { name, version, mode, ports, secret } = decodeENV()
log.success(`"${name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)
log.warn(`Secret: [${secret.slice(0, 8)}...]`)

Run({

    onStart: (_: any) => {

        /** Process Manage **/
        log.success(`Core Server: is starting on ${ports[0]}`)
        _.name = name
        _.manage = new Manage()
        _.proxy = new Core({
            port: Number(ports[0]),
            auth: (req: any, res: any, next: any) => {
                try {

                    req.headers.verified = 'no'
                    const verify: any = jwt.verify(req.headers.authorization.split(' ')[1], secret)
                    if (typeof verify === 'object') req.headers = { ...req.headers, ...verify, verified: 'yes' }
                    next()

                }
                catch (err: any) { next() }
                finally {

                    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0'
                    log.warn(`[Finally] -> From: ${ip} Verified: ${req.headers.verified}`)

                }
            }
        })

        /** Process Manage **/
        const API = new Host({ name, timeout: 30 * 1000, port: Number(ports[1]) })

        API.on('start', async ({ query }: any) => await _.manage.start(query.name))
        API.on('stop', async ({ query }: any) => await _.manage.stop(query.name))
        API.on('restart', async ({ query }: any) => await _.manage.restart(query.name))
        API.on('reload', async ({ query }: any) => await _.manage.reload(query.name)) /** NO-DOWNTIME 🚀 **/
        API.on('describe', async ({ query }: any) => await _.manage.describe(query.name))

        /** Authorization Token **/
        API.on('me', ({ headers }: any) => headers)
        API.on('verify', ({ query }: any) => {

            const payload: any = jwt.verify(query.token, secret)
            payload.iat = moment.unix(payload.iat).format('YY/MM/DD')
            payload.exp = moment.unix(payload.exp).format('YY/MM/DD')
            return payload

        })

        /** 
         * The Sign endpoint must be authorized or set redis:false when initializing the host
         * ----------------------------------------------------------------------------------
         * User:    localhost:8010/core_proxy/sign?name=Tulgaew&role=admin&project=*&expiresIn=180d
         * Vehicle: localhost:8010/core_proxy/sign?name=DR101&type=drill&project=Cullinan&expiresIn=180d
        **/
        API.on('sign', ({ query }: any) => jwt.sign(query, secret, { expiresIn: query.expiresIn ?? "14d" }))

        const example = {
            'vehicle': 'localhost:8010/core_proxy/sign?name=DR101&type=drill&project=Cullinan&expiresIn=180d',
            'user': 'localhost:8010/core_proxy/sign?name=Tulgaew&role=admin&project=*&expiresIn=180d',
            'roles': ['level-5', 'level-4', 'level-3', 'level-2', 'level-1'],
        }

        _.exit = () => {
            _.proxy.stop()
            log.warn(`<<< "${_.name}" server stopped >>>`) && process.exit(0)
        }

    },

    onExit: (_: any) => _.exit(),
    onError: (_: any, message: string) => log.error(message),

})