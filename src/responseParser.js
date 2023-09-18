import { HTTPParser } from "http-parser-js";
import { constructHeaderObject, HTTPServerAsyncResource } from "./utils";

export class ResponseParser {
    constructor(socket, requests) {
        this.requests = requests
        this.responses = []
        this.parser =  new HTTPParser();
        this.parser.initialize(HTTPParser.RESPONSE, new HTTPServerAsyncResource('HTTPINCOMINGMESSAGE', socket));
    
        this.parser[HTTPParser.kOnMessageComplete] = this.onMessageComplete;
        this.parser[HTTPParser.kOnHeadersComplete] = this.onHeadersComplete;
        this.parser[HTTPParser.kOnBody] = this.onBody;
    }

    onMessageComplete = () => {
        const req = this.requests.shift();
        const resp = this.responses.shift();

        let record = {
            code: resp.code,
            message: resp.message,
            headers: resp.headers,
            body: resp.body.toString(),
        };

        console.log(record);
    };

    onHeadersComplete = (response) => {
        const headers = constructHeaderObject(response.headers);

        const resp = {
            code: response.statusCode,
            headers: headers,
            message: "",
            body: Buffer.from('')
        };

        this.responses.push(resp);
    };

    onBody = (chunk, offset, length) => {
        const resp = this.responses[this.responses.length - 1];
        const new_body = Buffer.concat([resp.body, chunk.slice(offset, offset + length)]);
        resp.body = new_body;
    };
};
