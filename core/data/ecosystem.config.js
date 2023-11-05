const { encodeENV } = require('utils')
const pkg = require('./package.json')

const env = encodeENV({

    name: pkg.name,
    version: pkg.version,
    mode: process.env.MODE,
    me: 'master',
    proxy: process.env.MODE === 'development' ? 'http://localhost:8010' : 'http://139.59.115.158',
    replication_debug: true,
    sequelize_debug: true,
    pitunnel_token: 'pitunkey_p2S2HPO5qonUyEc1aGxfI4Yo3MaPnhyj',

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
            listen_timeout: 15000,
            restart_delay: 15000,
            instances: 1,
            log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
            env: env

        }
    ]
}