import { z } from 'zod';

export const ExperienceSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().nullable(),
  location: z.string().nullable(),
  price: z.number().nullable(),
  url: z.string().url().nullable(),
  category: z.string().nullable(),
  sourceUrl: z.string().url(),
  relevant: z.boolean(),
});

export type Experience = z.infer<typeof ExperienceSchema>;

export const ExperienceStateSchema = z.enum(['draft', 'review', 'published', 'rejected']);
export type ExperienceState = z.infer<typeof ExperienceStateSchema>;

export const ExperienceRecordSchema = ExperienceSchema.extend({
  confidence: z.number().min(0).max(1),
  fingerprint: z.string(),
  state: ExperienceStateSchema,
});

export type ExperienceRecord = z.infer<typeof ExperienceRecordSchema>;

export const LlmExtractionSchema = ExperienceSchema.omit({ sourceUrl: true });
export type LlmExtraction = z.infer<typeof LlmExtractionSchema>;
