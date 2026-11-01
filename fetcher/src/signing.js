import { createHash, createHmac } from 'node:crypto';

export const sha256 = body => createHash('sha256').update(body).digest('hex');
export function sign(secret, timestamp, method, pathWithQuery, rawBody = '') {
  return createHmac('sha256', secret)
    .update(`${timestamp}\n${method.toUpperCase()}\n${pathWithQuery}\n${sha256(rawBody)}`).digest('hex');
}
