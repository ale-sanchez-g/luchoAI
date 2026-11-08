import Client from 'http-client';

const client = new Client();

export async function call(path: string): Promise<unknown> {
  return client.get(path);
}
