import * as fs from 'fs'

export const host = '0.0.0.0'
export const port = 8080
export const cert_key = fs.readFileSync('certs/cert.key');