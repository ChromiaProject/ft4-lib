const fetch = typeof process !== 'object' ? window.fetch : require('node-fetch');

export async function httpGET(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}

