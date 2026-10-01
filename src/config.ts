import 'dotenv/config';
import process from 'node:process';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  aiProvider: required('AI_PROVIDER'),
  nvidiaApiKey: required('NVIDIA_API_KEY'),
  nvidiaModel: required('NVIDIA_MODEL'),
  strapiUrl: required('STRAPI_URL').replace(/\/$/, ''),
  strapiToken: required('STRAPI_TOKEN'),
};
