import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const characters = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/characters' }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    role: z.string(),
    group: z.string(),
    image: z.string().optional(),
    status: z.string().default('Неизвестно'),
    aliases: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    currentRelation: z.object({ positive: z.number(), negative: z.number() }),
    relationLabel: z.string(),
    lastUpdatedSession: z.number().optional(),
    tags: z.array(z.string()).default([]),
    relatedCharacters: z.array(z.string()).default([]),
    relatedSessions: z.array(z.number()).default([]),
    relationHistory: z.array(z.object({
      session: z.number().optional(),
      label: z.string().optional(),
      positive: z.number(),
      negative: z.number(),
      note: z.string(),
    })).default([]),
  }),
});

const diary = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/diary' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    session: z.number(),
    date: z.string().optional(),
    excerpt: z.string(),
    cover: z.string(),
    characters: z.array(z.string()).default([]),
    places: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    externalLinks: z.array(z.string()).default([]),
  }),
});

const chronicle = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/chronicle' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    session: z.number(),
    summary: z.string(),
    date: z.string().optional(),
    characters: z.array(z.string()).default([]),
    places: z.array(z.string()).default([]),
    consequences: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    diary: z.string().optional(),
  }),
});

const places = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/places' }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    region: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const worldview = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/worldview' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    icon: z.string(),
    summary: z.string(),
    order: z.number(),
    category: z.enum(['Принципы', 'Страхи', 'Слабости', 'Привязанности']).default('Принципы'),
    tags: z.array(z.string()).default([]),
  }),
});

const quotes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/quotes' }),
  schema: z.object({
    text: z.string(),
    source: z.string().default('Коэл Ворн'),
  }),
});

const library = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/library' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    kind: z.string(),
    summary: z.string(),
    sourceFile: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { characters, diary, chronicle, places, worldview, quotes, library };
