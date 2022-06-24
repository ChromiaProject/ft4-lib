const fetch =
  typeof process !== "object" ? window.fetch : require("node-fetch");

export async function get(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}
