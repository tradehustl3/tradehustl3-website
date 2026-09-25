import { mkdir, access, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { END_CARD, LINES, VIDEO } from "./config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const asset = path.join(here, "assets", "friends.png");
const generated = path.join(here, "generated");
const audioDir = path.join(generated, "audio");
const srtPath = path.join(generated, "commercial.srt");
const output = path.join(generated, "trade-hustl3-commercial-18s.mp4");

await mkdir(generated, { recursive: true });

async function requireFile(file, hint) {
  try {
    await access(file, constants.F_OK);
  } catch {
    console.error(`Missing: ${file}`);
    if (hint) console.error(hint);
    process.exit(1);
  }
}

function run(cmd, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with ${code}\n${stderr}`));
    });
  });
}

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return [h, m, s]
    .map((n) => String(n).padStart(2, "0"))
    .join(":") + "," + String(milli).padStart(3, "0");
}

function atempoChain(rate) {
  if (rate <= 1.0001) return [];
  const parts = [];
  let remaining = rate;
  while (remaining > 2) {
    parts.push("atempo=2");
    remaining /= 2;
  }
  parts.push(`atempo=${remaining.toFixed(5)}`);
  return parts;
}

await requireFile(
  asset,
  "Save the approved split-screen image as tools/commercial-18s/assets/friends.png",
);

for (const line of LINES) {
  await requireFile(
    path.join(audioDir, `${line.id}.mp3`),
    "Run node tools/commercial-18s/generate-audio.mjs first.",
  );
}

const srt = LINES.map((line, index) => {
  const who = line.speaker === "left" ? "LEFT" : "RIGHT";
  return [
    index + 1,
    `${srtTime(line.start)} --> ${srtTime(line.end)}`,
    `${who}: ${line.text}`,
    "",
  ].join("\n");
}).join("\n");

await writeFile(srtPath, srt, "utf8");

const inputArgs = ["-y", "-loop", "1", "-framerate", String(VIDEO.fps), "-i", asset];
for (const line of LINES) {
  inputArgs.push("-i", path.join(audioDir, `${line.id}.mp3`));
}

const audioFilters = [];
const delayedLabels = [];

for (let i = 0; i < LINES.length; i++) {
  const line = LINES[i];
  const probe = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    path.join(audioDir, `${line.id}.mp3`),
  ], true);

  const duration = Number(probe.stdout.trim());
  const window = line.end - line.start;
  const speedUp = duration > window ? duration / window : 1;
  const chain = [
    ...atempoChain(speedUp),
    `atrim=0:${window.toFixed(3)}`,
    "asetpts=N/SR/TB",
    `adelay=${Math.round(line.start * 1000)}|${Math.round(line.start * 1000)}`,
  ];
  const label = `a${i}`;
  audioFilters.push(`[${i + 1}:a]${chain.join(",")}[${label}]`);
  delayedLabels.push(`[${label}]`);
}

const rightWindows = LINES
  .filter((x) => x.speaker === "right")
  .map((x) => `between(t,${x.start},${x.end})`)
  .join("+");

const leftWindows = LINES
  .filter((x) => x.speaker === "left")
  .map((x) => `between(t,${x.start},${x.end})`)
  .join("+");

const subtitlePath = srtPath.replaceAll("\\", "/").replaceAll(":", "\\:");

const videoFilter = [
  `[0:v]scale=${VIDEO.width}:${VIDEO.height}:force_original_aspect_ratio=decrease`,
  `pad=${VIDEO.width}:${VIDEO.height}:(ow-iw)/2:(oh-ih)/2`,
  "setsar=1",
  `drawbox=x=0:y=0:w=iw/2:h=ih:color=black@0.16:t=fill:enable='${rightWindows}'`,
  `drawbox=x=iw/2:y=0:w=iw/2:h=ih:color=black@0.16:t=fill:enable='${leftWindows}'`,
  `subtitles='${subtitlePath}':force_style='FontName=DejaVu Sans,FontSize=23,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Alignment=2,MarginV=46'`,
  `trim=duration=${VIDEO.dialogueEnd}`,
  "setpts=PTS-STARTPTS[main]",
].join(",");

const endCard = [
  `color=c=0x102A43:s=${VIDEO.width}x${VIDEO.height}:r=${VIDEO.fps}:d=${END_CARD.end - END_CARD.start}`,
  "drawtext=font='DejaVu Sans':text='TRADE HUSTL3':fontcolor=white:fontsize=100:x=(w-text_w)/2:y=h*0.29",
  "drawtext=font='DejaVu Sans':text='BUILT BY HUSTL3. BACKED BY TRADE.':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h*0.48",
  "drawtext=font='DejaVu Sans':text='tradehustl3.com':fontcolor=0xD71920:fontsize=50:x=(w-text_w)/2:y=h*0.62",
  "format=yuv420p[end]",
].join(",");

const filterComplex = [
  videoFilter,
  endCard,
  `[main][end]concat=n=2:v=1:a=0[v]`,
  ...audioFilters,
  `${delayedLabels.join("")}amix=inputs=${LINES.length}:duration=longest:dropout_transition=0,atrim=0:${VIDEO.duration}[a]`,
].join(";");

await run("ffmpeg", [
  ...inputArgs,
  "-filter_complex", filterComplex,
  "-map", "[v]",
  "-map", "[a]",
  "-t", String(VIDEO.duration),
  "-r", String(VIDEO.fps),
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "18",
  "-c:a", "aac",
  "-b:a", "192k",
  "-movflags", "+faststart",
  output,
]);

console.log(`\nRendered: ${output}`);
