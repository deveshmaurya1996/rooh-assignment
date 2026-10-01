import { OpenAI } from 'openai';
import { config } from '../config';
import { LlmExtraction, LlmExtractionSchema } from '../schemas/experience';

export interface LLMProvider {
  extractExperience(content: string, label?: string): Promise<LlmExtraction>;
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

export class NvidiaProvider implements LLMProvider {
  private client = new OpenAI({
    apiKey: config.nvidiaApiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  async extractExperience(content: string, label = 'page'): Promise<LlmExtraction> {
    const prompt = `You extract structured event data from HTML for a personal-growth platform (retreats, workshops, coaching, mindfulness, wellness).

Return a JSON object with exactly these keys:
- title (string)
- description (string)
- date (string as written on the page, or null if missing)
- location (string or null)
- price (number in the listed currency units, or null if missing/"contact organizer"/unknown)
- url (where a user can book or attend, or null; not the page we scraped)
- category (short label or null)
- relevant (boolean: true only if this is a personal-growth experience)

Missing fields must be null. Output JSON only.`;

    console.log(
      `[llm] nvidia model=${config.nvidiaModel} source=${label} htmlChars=${content.length}`,
    );
    const started = Date.now();
    const resp = await this.client.chat.completions.create({
      model: config.nvidiaModel,
      messages: [
        { role: 'user', content: `${prompt}\n\n${content}` },
      ],
      temperature: 0,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });
    const ms = Date.now() - started;
    const choice = resp.choices[0];
    const text = choice?.message?.content;
    const usage = resp.usage;
    console.log(
      `[llm] response ${ms}ms finish=${choice?.finish_reason ?? 'unknown'}` +
        (usage
          ? ` tokens prompt=${usage.prompt_tokens} completion=${usage.completion_tokens}`
          : ''),
    );
    if (!text) throw new Error('Empty response from NVIDIA LLM');

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(text));
    } catch {
      console.error(`[llm] raw (not JSON): ${text.slice(0, 500)}`);
      throw new Error('LLM returned non-JSON');
    }

    const result = LlmExtractionSchema.safeParse(parsed);
    if (!result.success) {
      console.error(`[llm] raw: ${text.slice(0, 500)}`);
      throw new Error(`LLM JSON failed schema: ${result.error.message}`);
    }
    const e = result.data;
    console.log(
      `[llm] extracted title=${JSON.stringify(e.title)} relevant=${e.relevant}` +
        ` date=${e.date} location=${e.location} price=${e.price}` +
        ` url=${e.url} category=${e.category}`,
    );
    return e;
  }
}

export function getProvider(): LLMProvider {
  console.log(`[llm] provider=${config.aiProvider}`);
  switch (config.aiProvider) {
    case 'nvidia':
      return new NvidiaProvider();
    default:
      throw new Error(`Unknown AI_PROVIDER "${config.aiProvider}"`);
  }
}
