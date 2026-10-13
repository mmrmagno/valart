import type { APIRoute } from 'astro';
import { SITE } from '@/lib/config';

export const GET: APIRoute = ({ site }) => {
  const body = [
    `# ${SITE.title}`,
    '',
    `> ${SITE.description}`,
    '',
    '## Usage policy',
    '',
    '- Nothing on this site may be used to train, fine-tune or evaluate AI models, or be stored in datasets for that purpose.',
    '- Automated crawling by AI agents and AI search tools is not permitted. Known AI crawlers are refused.',
    '- The artworks belong to the people who drew them.',
    '',
    '## Links',
    '',
    `- [Robots policy](${new URL('/robots.txt', site)})`,
    `- [Source code](${SITE.repo})`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
