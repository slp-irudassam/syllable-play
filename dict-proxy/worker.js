/**
 * 음절놀이 온라인 사전 중계(프록시) Worker
 * - 한국어기초사전 API 키를 Cloudflare Secret(KRDICT_KEY)에 숨김
 * - 앱은 이 Worker만 호출 → 키가 브라우저/소스에 노출되지 않음
 * - 단어 등재 여부(사실)만 판별용으로 중계. 뜻풀이는 저장/가공하지 않음.
 *   출처: 국립국어원 「한국어기초사전」 (CC BY-SA 2.0 KR)
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) {
      return new Response('missing q', { status: 400, headers: cors });
    }
    if (!env.KRDICT_KEY) {
      return new Response('server not configured', { status: 500, headers: cors });
    }

    const api = 'https://krdict.korean.go.kr/api/search'
      + '?key=' + encodeURIComponent(env.KRDICT_KEY)
      + '&q=' + encodeURIComponent(q)
      + '&part=word&sort=dict&num=20';

    try {
      const r = await fetch(api, { cf: { cacheTtl: 86400, cacheEverything: true } });
      const body = await r.text();
      return new Response(body, {
        status: r.status,
        headers: {
          ...cors,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (e) {
      return new Response('upstream error', { status: 502, headers: cors });
    }
  },
};
