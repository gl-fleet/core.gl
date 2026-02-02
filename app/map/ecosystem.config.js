const pkg = require('./package.json')
const { encodeENV } = require('utils')

const env = encodeENV({
    name: pkg.name,
    version: pkg.version,
    mode: process.env.MODE,
})

module.exports = {
    apps: [
        env.u_mode === 'development' ? {

            name: env.u_name,
            script: "yarn",
            args: "start",
            interpreter: '/bin/bash',
            log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
            env: env

        } : {

            name: env.u_name,
            script: "./dist/run.js",
            exec_mode: "cluster",
            listen_timeout: 15000,
            restart_delay: 15000,
            instances: 1,
            log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
            env: env

        }
    ]
}