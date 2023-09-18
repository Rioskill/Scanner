import * as http from 'http'
import * as url from 'url'
import * as net from 'net'
import * as tls from 'node:tls'

import { cert_key } from './config'
import { constructHeaderString, constructRequestBuffer } from './utils'
import { getCertificate } from './ssl'
import { RequestParser, buildRequest } from './requestParser'
import { ResponseParser } from './responseParser'

// const proxy = (proxyReq, socket) => {
//     const requestParser = new RequestParser(options.host, options.port, socket, sendFn);
//     const responseParser = new ResponseParser(tlsSocket, requestParser.requests);

// }

const requestListener = (request, response) => {
    const parsedUrl = url.parse(request.url);
    const options = {
        host: parsedUrl.hostname,
        port: parsedUrl.port || 80
    };

    const proxyRequest = net.connect(options, () => {
        const headers = constructHeaderString(request.rawHeaders);

        // request.socket.on('data', (chunk) => {
        //     console.log('request data')
        //     console.log(chunk)
        // });
        // request.socket.on('end', (chunk) => {
        //     console.log('request end')
        //     console.log(chunk)
        // });

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

        const sendFn = (record) => {
            const request = buildRequest(record);
            proxyReq.write(request);
        }

        const requestParser = new RequestParser(options.host, options.port, tlsSocket, sendFn);
        const responseParser = new ResponseParser(tlsSocket, requestParser.requests);

        tlsSocket.on('data', chunk => {
            requestParser.parser.execute(chunk);
        });

        tlsSocket.on('end', () => {
            requestParser.parser.finish();
        });

        proxyReq.on('data', chunk => {
            responseParser.parser.execute(chunk);
        });

        proxyReq.on('end', chunk => {
            responseParser.parser.finish();
        })

        proxyReq.pipe(tlsSocket);
    });

    proxyReq.on('error', e => {
        console.log(e);
    });
});

server.on('error', e => {
    console.log('server error:', e);
});

export { server };
