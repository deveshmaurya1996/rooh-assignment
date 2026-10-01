import { config } from '../config';
import { ExperienceRecord } from '../schemas/experience';

const API = `${config.strapiUrl}/api/experiences`;

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${config.strapiToken}`,
    'Content-Type': 'application/json',
  };
}

async function fingerprintExists(fp: string, status: 'draft' | 'published'): Promise<boolean> {
  const url = new URL(API);
  url.searchParams.set('filters[fingerprint][$eq]', fp);
  url.searchParams.set('pagination[pageSize]', '1');
  url.searchParams.set('status', status);
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Strapi duplicate check failed (${status}): ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { meta?: { pagination?: { total?: number } } };
  return (body.meta?.pagination?.total ?? 0) > 0;
}

export async function checkDuplicate(fp: string): Promise<boolean> {
  return (await fingerprintExists(fp, 'draft')) || (await fingerprintExists(fp, 'published'));
}

export async function createExperience(rec: ExperienceRecord): Promise<void> {
  const res = await fetch(`${API}?status=draft`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ data: rec }),
  });
  if (!res.ok) {
    throw new Error(`Strapi create failed: ${res.status} ${await res.text()}`);
  }
}
