import { HTTPParser } from "http-parser-js";
import { constructHeaderObject } from "./utils";
import { parseUrl, parseParams, HTTPServerAsyncResource, parseCookie } from "./utils";

export class RequestParser {
    constructor(host, port, socket, proxy_callback) {
        this.host = host;
        this.port = port;
        this.requests = [];
        this.parser = new HTTPParser();
        this.parser.initialize(HTTPParser.REQUEST, new HTTPServerAsyncResource('HTTPINCOMINGMESSAGE', socket));

        this.parser[HTTPParser.kOnMessageComplete] = this.onMessageComplete;
        this.parser[HTTPParser.kOnHeadersComplete] = this.onHeadersComplete;
        this.parser[HTTPParser.kOnBody] = this.onBody;

        this.proxy_callback = proxy_callback;
    }

    onMessageComplete = () => {
        const req = this.requests[this.requests.length - 1];
        req.request_time = new Date();

        const [path, params] = parseUrl(req.url);
        const method = HTTPParser.methods[req.method]

        const cookie = req.headers['Cookie'];
        const body = req.request_body.toString();

        let record = {
            method: method,
            path: path,
            headers: req.headers
        }

        if (params !== undefined) {
            record.get_params = params;
        }

        if (cookie !== undefined) {
            record.cookies = parseCookie(cookie);
        }

        if (body !== undefined) {
            record.body = body;
        }

        if (
                method === 'POST' && 
                record.headers['Content-Type'] !== undefined &&
                record.headers['Content-Type'].includes('application/x-www-form-urlencoded')
           ) 
        {
            record.post_params = parseParams(body);
        }

        this.proxy_callback(record);

        // console.log(buildRequest(record));
    }

    onHeadersComplete = (request) => {
        const headers = constructHeaderObject(request.headers);

        const req = {
            host: this.host,
            port: this.port,
            headers: headers,
            url: request.url,
            method: request.method,
            shouldKeepAlive: request.shouldKeepAlive,
            request_body: Buffer.from('')
        };

        this.requests.push(req);
    }

    onBody = (chunk, offset, length) => {
        const req = this.requests[this.requests.length - 1];
        const new_body = Buffer.concat([req.request_body, chunk.slice(offset, offset + length)]);
        req.request_body = new_body;
    }
};

export function buildRequest(request) {
    const queryParams = request.get_params ? 
        Object.entries(request.get_params)
        .map(([param, value]) => `${param}=${value}`)
        .join('&') : '';

    let req = `${request.method} ${request.path}?${queryParams} HTTP/1.1\r\n`;

    req += Object.entries(request.headers).map(([header, value])=>`${header}: ${value}\r\n`).join('');

    req += '\r\n';
    req += request.body;

    return req;
}
