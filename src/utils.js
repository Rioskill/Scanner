export const constructHeaderString = rawHeaders => {
    let headers = '';
    for (let i = 0; i < rawHeaders.length; i += 2) {
        if (rawHeaders[i] !== 'Proxy-Connection') {
            headers += `${rawHeaders[i]}: ${rawHeaders[i + 1]}\r\n`;
        }
    }
    return headers;
}

export const constructRequestBuffer = (method, path, headers) => {
    return Buffer.from(`${method} ${path} HTTP/1.1\r\n${headers}\r\n`);
}
