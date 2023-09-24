import multer from 'multer'
import { Now, log } from 'utils'

const Upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            log.info(`[Upload] -> ${file.originalname} / ${file.mimetype}`)
            return cb(null, './shared')
        },
        filename: (req, file, cb) => {
            const ext = file.originalname.split('.')
            cb(null, `${Now()}.${ext[ext.length - 1].toLowerCase()}`)
        }
    })
}).single('file')

export const Save = (req: any, res: any) => new Promise((_res, _rej) => {
    return Upload(req, res, (err: any) => err ? _rej(err.message) : _res(req))
})