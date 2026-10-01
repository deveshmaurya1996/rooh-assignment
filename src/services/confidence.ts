import { Experience, ExperienceState } from '../schemas/experience';

export function adjustConfidence(exp: Experience): number {
  let conf = 1;
  if (!exp.date) conf *= 0.7;
  if (!exp.location) conf *= 0.8;
  if (exp.price === null) conf *= 0.9;
  return Math.min(1, Math.max(0, conf));
}

export function toState(relevant: boolean, conf: number): ExperienceState {
  if (!relevant) return 'rejected';
  return conf >= 0.7 ? 'draft' : 'review';
}
