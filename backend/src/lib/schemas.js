import { z } from 'zod';

export const itemSchema = z.object({
  q: z.coerce.number().min(0).default(0),
  d: z.string().max(200).default(''),
  p: z.coerce.number().min(0).default(0),
  x: z.coerce.number().min(0).max(100).default(0),
});

export const receiptPayloadSchema = z.object({
  style: z.union([z.literal(1), z.literal(2)]).default(1),
  theme: z.string().max(40).default('blue'),
  logo: z.string().max(3_000_000).default(''),
  bn: z.string().max(200).default(''),
  bp: z.string().max(200).default(''),
  ba: z.string().max(200).default(''),
  bm: z.string().max(200).default(''),
  cn: z.string().max(200).default(''),
  ca: z.string().max(200).default(''),
  no: z.string().max(200).default(''),
  date: z.string().max(40).default(''),
  pay: z.string().max(200).default(''),
  cur: z.string().max(10).default('₦'),
  items: z.array(itemSchema).max(50).default([]),
  email: z.string().email().max(254).optional(),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(200),
});

export const historyQuerySchema = z.object({
  style: z.enum(['business', 'invoice']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});