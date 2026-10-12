import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const gallery = defineCollection({
  loader: glob({ base: './src/content/gallery', pattern: '*.json' }),
  schema: z
    .object({
      name: z.string().min(1).max(60),
      author: z.string().min(1).max(60),
      art: z.string().min(1),
      gridSize: z.object({
        width: z.number().int().min(1).max(80),
        height: z.number().int().min(1).max(40),
      }),
      submittedAt: z.coerce.date(),
    })
    .refine((a) => a.art.split('\n').length === a.gridSize.height, {
      message: 'art must have exactly gridSize.height lines',
    })
    .refine((a) => Math.max(...a.art.split('\n').map((l) => [...l].length)) <= a.gridSize.width, {
      message: 'no art line may be wider than gridSize.width',
    }),
});

export const collections = { gallery };
