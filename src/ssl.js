import * as tls from 'node:tls'
import * as fs from 'fs'
import {spawn} from 'child_process'
import * as path from 'path'

import { cert_key } from './config'

export const cert_cache = new Map();
const cert_cache_path = 'certs/cached/'

fs.readdirSync(cert_cache_path).forEach(cert_file => {
    const domain = cert_file.substring(0, cert_file.lastIndexOf('.'))
    const cert_file_path = path.join(cert_cache_path, cert_file)
    cert_cache.set(domain, fs.readFileSync(cert_file_path));
});

const generateCertificate = (server, callback) => {
    let gen_cert_script = spawn('scripts/gen.sh', [server, Math.floor(Math.random() * 1000000000000)]);

    gen_cert_script.stdout.once('data', certificate => {
        const context = tls.createSecureContext({
            key: cert_key,
            cert: certificate
        });

        callback(null, context);

        cert_cache.set(server, certificate);

        const caching_path = path.join(cert_cache_path, `${server}.crt`)
        fs.writeFile(caching_path, certificate, (err) => {
            if (err) {
                console.log(err.message)
            }
        });
    })

    gen_cert_script.stderr.on('data', data => {
        console.log(`cert gen stderr: ${data}`)
    })
}

export const getCertificate = (server, callback) => {
    if (cert_cache.has(server)) {
        const certificate = cert_cache.get(server);
        const context = tls.createSecureContext({
            key: cert_key,
            cert: certificate
        });

        callback(null, context);
    } else {
        generateCertificate(server, callback);
    }
}
