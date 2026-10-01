import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { getProvider } from './providers/llm';
import { ExperienceRecordSchema, ExperienceSchema } from './schemas/experience';
import { adjustConfidence, toState } from './services/confidence';
import { normalizeDate } from './services/dates';
import { calculateFingerprint } from './services/deduplication';
import { checkDuplicate, createExperience } from './services/strapi';

const FIXTURES: { file: string; sourceUrl: string }[] = [
  { file: 'complete.html', sourceUrl: 'https://eventbrite.com/e/retreat' },
  { file: 'incomplete.html', sourceUrl: 'https://example.com/workshop' },
];

type Source = { label: string; sourceUrl: string; html: string };

async function loadFixtures(): Promise<Source[]> {
  const out: Source[] = [];
  for (const { file, sourceUrl } of FIXTURES) {
    const html = await readFile(resolve(__dirname, '../samplePages', file), 'utf-8');
    out.push({ label: file, sourceUrl, html });
  }
  return out;
}

async function loadUrl(sourceUrl: string): Promise<Source> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${sourceUrl}`);
  return { label: sourceUrl, sourceUrl, html: await res.text() };
}

function extraUrl(): string | undefined {
  const i = process.argv.indexOf('--url');
  if (i === -1) return undefined;
  const u = process.argv[i + 1];
  if (!u) throw new Error('--url requires an https URL');
  return u;
}

async function run(): Promise<void> {
  const llm = getProvider();
  const sources = await loadFixtures();
  const url = extraUrl();
  if (url) sources.push(await loadUrl(url));

  for (const src of sources) {
    let extraction;
    try {
      extraction = await llm.extractExperience(src.html, src.label);
    } catch (e) {
      console.error(`✗ LLM failed for ${src.label}:`, e);
      continue;
    }

    const parsed = ExperienceSchema.safeParse({
      ...extraction,
      date: normalizeDate(extraction.date),
      sourceUrl: src.sourceUrl,
    });
    if (!parsed.success) {
      console.error(`✗ Validation failed for ${src.label}:`, parsed.error.format());
      continue;
    }

    const exp = parsed.data;
    const confidence = adjustConfidence(exp);
    const state = toState(exp.relevant, confidence);
    const fingerprint = calculateFingerprint(exp);

    if (await checkDuplicate(fingerprint)) {
      console.log(`— skipped duplicate: ${exp.title}`);
      continue;
    }

    const recParse = ExperienceRecordSchema.safeParse({
      ...exp,
      confidence,
      fingerprint,
      state,
    });
    if (!recParse.success) {
      console.error(`✗ Record validation failed:`, recParse.error.format());
      continue;
    }

    await createExperience(recParse.data);
    console.log(`✓ ingested "${exp.title}" → ${state} (confidence ${confidence.toFixed(2)})`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
