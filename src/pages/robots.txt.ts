import type { APIRoute } from 'astro';
import { AI_BOTS } from '@/lib/bots';

export const GET: APIRoute = ({ site }) => {
  const body = [
    '# Search engines are welcome. AI crawlers and training-data collectors are not.',
    ...AI_BOTS.map((bot) => `User-agent: ${bot}`),
    'Disallow: /',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${new URL('/sitemap-index.xml', site)}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
