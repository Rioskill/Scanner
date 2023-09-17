import * as http from 'http'
import * as url from 'url'
import * as net from 'net'
import * as tls from 'node:tls'

import { host, port, cert_key } from './config'
import { constructHeaderString, constructRequestBuffer } from './utils'
import { getCertificate } from './ssl'

const requestListener = function (request, response) {
    const parsedUrl = url.parse(request.url);
    const options = {
        host: parsedUrl.hostname,
        port: parsedUrl.port || 80
    };

    const proxyRequest = net.connect(options, () => {
        request.socket.on('data', (chunk) => {
            console.log('request data')
            console.log(chunk)
        });
        request.socket.on('end', (chunk) => {
            console.log('request end')
            console.log(chunk)
        });

        const headers = constructHeaderString(request.rawHeaders);

        let p = constructRequestBuffer(request.method, parsedUrl.path, headers);
        proxyRequest.write(p);
        request.socket.pipe(proxyRequest).pipe(request.socket);
    });
};

const server = http.createServer(requestListener);

server.on('connect', (request, socket, head) => {
    socket.on('error', () => {
        console.log('connect socket error');
    });

    const u = request.url.split(':');
    const options = {
        rejectUnauthorized: false
    };
    if (u.length === 2) {
        options.host = u[0];
        options.port = u[1]
    } else {
        options.host = request.url;
        options.port = 443
    }

    const proxyReq = tls.connect(options, () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node.js-Proxy\r\n' +
            '\r\n');

        const tlsSocket = new tls.TLSSocket(socket, {
            key: cert_key,
            SNICallback: getCertificate,
            isServer: true
        });

        tlsSocket.on('error', e=>{
            console.log('tls socket error', e);
        });

        // const requestParser = createRequestParser(tlsSocket, requestsStore, options.host, options.port, true);
        // const responseParser = createResponseParser(proxyReq, requestsStore);

        tlsSocket.pipe(proxyReq).pipe(tlsSocket);

        // tlsSocket.on('data', (chunk) => {
        //     // requestParser.execute(chunk)
        // });
        // tlsSocket.on('end', () => {
        //     requestParser.finish()
        // });
        // proxyReq.on('data', (chunk) => {
        //     // responseParser.execute(chunk)
        // });
        // proxyReq.on('end', () => {
        //     responseParser.finish()
        // });
    });

    proxyReq.on('error', e => {
        console.log(e);
    });
});

server.on('error', e => {
    console.log('server error:', e);
});

server.listen(port, host, () => {
    console.log(`Proxy server is running on http://${host}:${port}`);
});
