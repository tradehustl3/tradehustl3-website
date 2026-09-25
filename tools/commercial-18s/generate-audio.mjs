import { mkdir, access, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { LINES, VOICES } from "./config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "generated", "audio");
const force = process.argv.includes("--force");
const apiKey = process.env.ELEVENLABS_API_KEY;

if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY.");
  console.error('Run: export ELEVENLABS_API_KEY="your_key_here"');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

async function exists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

for (const line of LINES) {
  const target = path.join(outDir, `${line.id}.mp3`);

  if (!force && await exists(target)) {
    console.log(`skip  ${line.id} (already exists)`);
    continue;
  }

  const voiceId = VOICES[line.speaker];
  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}` +
    "?output_format=mp3_44100_128";

  console.log(`make  ${line.id} [${line.speaker}]`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: line.text,
      model_id: "eleven_multilingual_v2",
      // Intentionally omit voice_settings so ElevenLabs uses the
      // saved settings you already tuned for each voice.
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `ElevenLabs failed for ${line.id}: ${response.status} ${body}`,
    );
  }

  const audio = Buffer.from(await response.arrayBuffer());
  await writeFile(target, audio);
}

console.log("\nDialogue generation complete.");
