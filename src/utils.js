export const constructHeaderObject = rawHeaders => {
    let headers = []
    for (let i = 0; i < rawHeaders.length; i += 2) {
        if (rawHeaders[i] !== 'Proxy-Connection' && rawHeaders[i] !== 'Accept-Encoding') {
            headers.push([rawHeaders[i], rawHeaders[i+ 1]]);
        }
    }

    return Object.fromEntries(headers);
}

export const constructHeaderString = rawHeaders => {
    let headers = '';
    for (let i = 0; i < rawHeaders.length; i += 2) {
        if (rawHeaders[i] !== 'Proxy-Connection' && rawHeaders[i] !== 'Accept-Encoding') {
            headers += `${rawHeaders[i]}: ${rawHeaders[i + 1]}\r\n`;
        }
    }
    return headers;
}

export const constructRequestBuffer = (method, path, headers) => {
    return Buffer.from(`${method} ${path} HTTP/1.1\r\n${headers}\r\n`);
}

export class HTTPServerAsyncResource {
    constructor(type, socket) {
        this.type = type;
        this.socket = socket;
    }
}

export function parseParams(params_str) {
    if (params_str === undefined) {
        return undefined;
    }

    const parsed_params = params_str.split('&').map(param => param.split('='));
    return Object.fromEntries(parsed_params);
}

export function parseUrl(url) {
    const [path, params] = url.split('?');

    return [path, parseParams(params)];
}

export function parseCookie(cookie_str) {
    const cookies = cookie_str.split(';').map(cookie => cookie.trim()).filter(cookie => cookie !== '');
    const parsed_cookies = cookies.map(cookie => cookie.split('='));

    return Object.fromEntries(parsed_cookies);
}
