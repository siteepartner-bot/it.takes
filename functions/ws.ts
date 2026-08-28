// Cloudflare Pages Function WebSocket Endpoint
export async function onRequest(context: { request: Request }) {
  const { request } = context;
  const upgradeHeader = request.headers.get('Upgrade');

  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response(
      JSON.stringify({
        message: 'Aether Duo WebSocket endpoint. Connect via WebSocket or use WebRTC P2P.',
        status: 'online',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // If Cloudflare WebSocketPair is available in runtime
  if (typeof (globalThis as any).WebSocketPair !== 'undefined') {
    const pair = new (globalThis as any).WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    (server as any).accept();

    server.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'ping_server') {
          server.send(
            JSON.stringify({
              type: 'pong',
              clientTime: data.clientTime,
              serverTime: Date.now(),
            })
          );
        }
      } catch {
        // Ignore parse errors
      }
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as any);
  }

  return new Response('WebSocket upgrade not supported in this runtime. Please use P2P mode.', {
    status: 501,
  });
}
