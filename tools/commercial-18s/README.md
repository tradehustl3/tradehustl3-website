# TRADE HUSTL3 — 18-second commercial

This folder builds the first coded cut of the split-screen TRADE HUSTL3 commercial.

## Locked voice mapping

- Left / laptop character: `3w1kUvxu1LioQcLgp1KY`
- Right / truck character: `6OzrBCQf8cjERkYgzSg8`

The scripts use the voices' saved ElevenLabs settings instead of overriding the settings you tuned in the ElevenLabs UI.

## 1. Add the approved image

Save the approved two-friends split-screen artwork as:

`tools/commercial-18s/assets/friends.png`

## 2. Set the ElevenLabs API key

From the repository root:

```bash
export ELEVENLABS_API_KEY="your_key_here"
```

Do not commit the key.

## 3. Generate dialogue

```bash
node tools/commercial-18s/generate-audio.mjs
```

Generated MP3 clips go to:

`tools/commercial-18s/generated/audio/`

Use `--force` to regenerate existing clips:

```bash
node tools/commercial-18s/generate-audio.mjs --force
```

## 4. Render the commercial

FFmpeg and FFprobe must be installed:

```bash
sudo apt install ffmpeg
```

Then run:

```bash
node tools/commercial-18s/render.mjs
```

Output:

`tools/commercial-18s/generated/trade-hustl3-commercial-18s.mp4`

## Timeline

Dialogue runs from 0:00–0:16. The final 2 seconds are a clean TRADE HUSTL3 end card.

The renderer automatically speeds up a generated line only when that line is longer than its assigned window. It never slows a short line down to fill dead air.
