export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'Aether Duo Game Service',
      runtime: 'cloudflare-pages',
      timestamp: Date.now(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  );
}
