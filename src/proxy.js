import * as http from 'http'
import * as url from 'url'
import * as net from 'net'
import * as tls from 'node:tls'

import { cert_key } from './config'
import { constructHeaderString, constructRequestBuffer } from './utils'
import { getCertificate } from './ssl'
import { RequestParser, buildRequest } from './requestParser'
import { ResponseParser } from './responseParser'

export const proxy = (proxyReqSocket, socket, options) => {
    const sendFn = (record) => {
        const request = buildRequest(record);
        proxyReqSocket.write(request);
    }

    const requestParser = new RequestParser(options.host, options.port, socket, sendFn);
    const responseParser = new ResponseParser(socket, requestParser.requests);

    socket.on('data', chunk => {
        requestParser.parser.execute(chunk);
    });

    socket.on('end', () => {
        requestParser.parser.finish();
    });

    proxyReqSocket.on('data', chunk => {
        responseParser.parser.execute(chunk);
    });

    proxyReqSocket.on('end', () => {
        responseParser.parser.finish();
    })

    proxyReqSocket.pipe(socket);
}

const requestListener = (request, response) => {
    const parsedUrl = url.parse(request.url);
    const options = {
        host: parsedUrl.hostname,
        port: parsedUrl.port || 80
    };

    const proxyRequest = net.connect(options, () => {
        const headers = constructHeaderString(request.rawHeaders);
        const p = constructRequestBuffer(request.method, parsedUrl.path, headers);

        const sendFn = (record) => {
            const request = buildRequest(record);
            proxyRequest.write(request);
        }

        const requestParser = new RequestParser(options.host, options.port, request.socket, sendFn);
        const responseParser = new ResponseParser(request.socket, requestParser.requests);

        request.socket.on('data', chunk => {
            requestParser.parser.execute(chunk);
        });
    
        request.socket.on('end', () => {
            requestParser.parser.finish();
        });
    
        proxyRequest.on('data', chunk => {
            responseParser.parser.execute(chunk);
        });
    
        proxyRequest.on('end', () => {
            responseParser.parser.finish();
        })

        requestParser.parser.execute(p);
        proxyRequest.pipe(request.socket);

        proxyRequest.write(p);
    });

    proxyRequest.on('error', e => {
        console.log('http error', e);
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

        proxy(proxyReq, tlsSocket, options);
    });

    proxyReq.on('error', e => {
        console.log(e);
    });
});

server.on('error', e => {
    console.log('server error:', e);
});

export { server as proxyServer };
