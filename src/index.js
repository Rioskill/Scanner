import { server } from './proxy'
import { host, port } from './config'
import { dbClient } from './db'

server.listen(port, host, () => {
    console.log(`Proxy server is running on http://${host}:${port}`);
});    

const api_port = 8000;


