const { encodeENV } = require('utils')
const pkg = require('./package.json')

const env = encodeENV({

    name: pkg.name,
    version: pkg.version,
    mode: process.env.MODE,
    ports: `4010,4011,4012`,
    me: 'master',
    replication_debug: true,
    sequelize_debug: true,

})

module.exports = {
    apps: [
        env.u_mode === 'development' ? {

            name: env.u_name,
            script: "npm",
            args: "start",
            log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
            env: env

        } : {

            name: env.u_name,
            script: "./dist/run.js",
            exec_mode: "cluster",
            instances: 2,
            log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
            env: env

        }
    ]
}