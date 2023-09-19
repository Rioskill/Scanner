import * as http from 'http'
import * as url from 'url'
import * as net from 'net'

import { proxyServer, proxy } from './proxy'
import { host, port } from './config'
import { request_collection } from './db'
import { ObjectId } from 'mongodb'
import { RequestParser, buildRequest } from './requestParser'
import { ResponseParser } from './responseParser'


proxyServer.listen(port, host, () => {
    console.log(`Proxy server is running on http://${host}:${port}`);
});    

const api_port = 8000;

const requestListener = async (request, response) => {
    const parsedUrl = url.parse(request.url);
    const path = parsedUrl.path;
    const path_parts = path.split('/')

    if (path_parts[1] === 'requests' && 
        (path_parts[2] === undefined || path_parts[2] === '')) {
        const result = await request_collection.find().toArray();
        response.writeHead(200, {'Content-Type': 'application/json'});

        response.end(JSON.stringify(result));
        return;
    }

    if (path_parts[1] === 'requests') {
        const id = path_parts[2];
        const result = await request_collection.findOne({
            "_id": new ObjectId(id)
        });
        response.writeHead(200, {'Content-Type': 'application/json'});

        response.end(JSON.stringify(result));
        return; 
    }

    if (path_parts[1] === 'repeat') {
        const id = path_parts[2];

        const request_record = await request_collection.findOne({
            "_id": new ObjectId(id)
        });

        const options = {
            host: request_record.host,
            port: request_record.port
        }

        const request_str = buildRequest(request_record);

        const proxyRequest = net.connect(options, () => {
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
    
            requestParser.parser.execute(request_str);
            requestParser.parser.finish();
            proxyRequest.pipe(request.socket);
    
            proxyRequest.write(request_str);
        });

        return;
    }

    response.writeHead(404);
    response.end();
}

const server = http.createServer(requestListener);
server.listen(api_port, host, () => {
    console.log(`API server is running on http://${host}:${api_port}`);
});