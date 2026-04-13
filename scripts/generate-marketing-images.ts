/**
 * generate-marketing-images.ts
 *
 * Build-time script that generates brand-consistent marketing images for the
 * RentOS landing page using Google Gemini image generation.
 *
 * Usage:
 *   npx tsx scripts/generate-marketing-images.ts            # generate all images
 *   npx tsx scripts/generate-marketing-images.ts --dry-run   # log prompts only
 *
 * Requires GOOGLE_API_KEY in .env.local (or already exported).
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------

const BRAND_PREFIX = [
  'Flat illustration style',
  'warm palette (#fefcf7 background, #f0a500 accents, #5a7a5a secondary)',
  'Thai-friendly subject matter',
  'no text in image',
  'mobile-optimized composition',
].join(', ');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'images', 'marketing');

// Primary: gemini-2.0-flash (supports image generation via responseModalities)
// Fallback: gemini-2.5-flash-image (dedicated image model, often quota-limited)
const MODEL = 'gemini-2.0-flash';

// ---------------------------------------------------------------------------
// Image definitions
// ---------------------------------------------------------------------------

interface ImageTask {
  /** Filename (without extension -- always saved as .png) */
  name: string;
  /** Human-readable label for logging */
  label: string;
  /** The full prompt sent to Gemini */
  prompt: string;
}

const IMAGE_TASKS: ImageTask[] = [
  {
    name: 'hero',
    label: 'Hero image',
    prompt: [
      BRAND_PREFIX,
      'A warmly-lit flat illustration of a modern Thai apartment and condo building set against a clear sky.',
      'Saffron gold (#f0a500) and sage green (#5a7a5a) accents on a warm white (#fefcf7) background.',
      'Tropical plants and a welcoming entrance.',
      'Wide 16:9 aspect ratio, suitable as a hero banner.',
    ].join('. '),
  },
  {
    name: 'og',
    label: 'OG image (1200x630)',
    prompt: [
      BRAND_PREFIX,
      'Open Graph social sharing image, exactly 1200x630 pixels.',
      '"RentOS - People First" branding visual.',
      'A flat illustration showing a friendly landlord handing a key to a smiling tenant in front of a Thai condo.',
      'Saffron gold (#f0a500) key, sage green (#5a7a5a) foliage accents, warm white (#fefcf7) background.',
      'Clean composition with space for overlay text on the left third.',
    ].join('. '),
  },
  {
    name: 'avatar-1',
    label: 'Testimonial avatar 1',
    prompt: [
      BRAND_PREFIX,
      'Circular avatar illustration of a friendly young Thai woman smiling warmly.',
      'Saffron gold (#f0a500) earrings, sage green (#5a7a5a) top.',
      'Warm white (#fefcf7) background, bust portrait, no photorealism.',
      'Square 1:1 aspect ratio.',
    ].join('. '),
  },
  {
    name: 'avatar-2',
    label: 'Testimonial avatar 2',
    prompt: [
      BRAND_PREFIX,
      'Circular avatar illustration of a friendly middle-aged Thai man with glasses smiling warmly.',
      'Sage green (#5a7a5a) polo shirt, saffron gold (#f0a500) glasses frames.',
      'Warm white (#fefcf7) background, bust portrait, no photorealism.',
      'Square 1:1 aspect ratio.',
    ].join('. '),
  },
  {
    name: 'avatar-3',
    label: 'Testimonial avatar 3',
    prompt: [
      BRAND_PREFIX,
      'Circular avatar illustration of a friendly young Thai non-binary person with short hair smiling warmly.',
      'Saffron gold (#f0a500) scarf, sage green (#5a7a5a) jacket.',
      'Warm white (#fefcf7) background, bust portrait, no photorealism.',
      'Square 1:1 aspect ratio.',
    ].join('. '),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadApiKey(): string {
  // Try reading from .env.local manually (avoids adding dotenv as a dep)
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (key === 'GOOGLE_API_KEY') return value;
    }
  }

  // Fall back to environment variable
  if (process.env.GOOGLE_API_KEY) {
    return process.env.GOOGLE_API_KEY;
  }

  throw new Error(
    'GOOGLE_API_KEY not found. Set it in .env.local or export it as an environment variable.'
  );
}

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

function log(message: string): void {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${message}`);
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

async function generateImage(client: GoogleGenAI, task: ImageTask): Promise<void> {
  log(`Generating: ${task.label} ...`);

  const response = await client.models.generateContent({
    model: MODEL,
    contents: task.prompt,
    config: {
      responseModalities: ['image', 'text'],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error(`No parts returned for "${task.label}"`);
  }

  // Find the first inline image part
  const imagePart = parts.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData?.data) {
    // Log any text response for debugging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textPart = parts.find((p: any) => p.text);
    if (textPart?.text) {
      log(`Model text response for "${task.label}": ${textPart.text}`);
    }
    throw new Error(
      `No image data returned for "${task.label}". The model may have refused or returned text only.`
    );
  }

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const ext = imagePart.inlineData.mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const outPath = path.join(OUTPUT_DIR, `${task.name}.${ext}`);

  fs.writeFileSync(outPath, buffer);
  log(`Saved: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('RentOS Marketing Image Generator');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no API calls)' : 'LIVE'}`);
  console.log('='.repeat(60));
  console.log();

  if (dryRun) {
    for (const task of IMAGE_TASKS) {
      console.log(`--- ${task.label} (${task.name}.png) ---`);
      console.log(`Prompt: ${task.prompt}`);
      console.log();
    }
    log('Dry run complete. No images generated.');
    return;
  }

  const apiKey = loadApiKey();
  const client = new GoogleGenAI({ apiKey });

  ensureOutputDir();

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < IMAGE_TASKS.length; i++) {
    const task = IMAGE_TASKS[i]!;
    try {
      await generateImage(client, task);
      succeeded++;
      // Rate-limit pacing: wait 10s between successful requests
      if (i < IMAGE_TASKS.length - 1) {
        log('Waiting 10s before next request (rate-limit pacing)...');
        await new Promise((r) => setTimeout(r, 10_000));
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      log(`ERROR generating "${task.label}": ${message}`);

      // If rate-limited, wait before trying the next image
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        log('Rate limited — waiting 35s before next attempt...');
        await new Promise((r) => setTimeout(r, 35_000));
      }
    }
  }

  console.log();
  console.log('='.repeat(60));
  log(`Done. ${succeeded} succeeded, ${failed} failed out of ${IMAGE_TASKS.length} images.`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
