// Cloudflare Pages Function for Gemini Status Route
export async function onRequest(context) {
  const { env } = context;
  const isAvailable = !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim());

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  return new Response(
    JSON.stringify({
      available: isAvailable,
      model: 'gemini-3.1-flash-lite',
      host: 'cloudflare-pages',
      message: isAvailable
        ? 'سرویس جمینای کلودفلر آماده به کار است.'
        : 'کلید GEMINI_API_KEY در کلودفلر متغیرها ست نشده است.',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
