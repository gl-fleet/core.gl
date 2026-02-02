const { encodeENV, env: e } = require('utils')
const pkg = require('./package.json')

const env = encodeENV({

    name: pkg.name,
    version: pkg.version,
    mode: e.MODE,
    me: 'master',
    proxy: e.MODE === 'development' ? 'http://localhost:8010' : 'http://139.59.115.158',
    // db_name: e.MODE === 'development' ? 'umine_dev' : 'umine',
    db_name: e.MODE === 'development' ? 'umine' : 'umine',
    db_host: e.DB_HOST,
    db_user: e.DB_USER,
    db_pass: e.DB_PASS,

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