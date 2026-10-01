import { createHash } from 'node:crypto';
import { Experience } from '../schemas/experience';

export function calculateFingerprint(exp: Experience): string {
  const norm = (s: string) => s.trim().toLowerCase();
  return createHash('sha256').update(`${norm(exp.sourceUrl)}|${norm(exp.title)}`).digest('hex');
}
