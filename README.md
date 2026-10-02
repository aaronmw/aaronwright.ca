# aaronwright.ca

Aaron’s portfolio, built with Next.js and deployed on Netlify.

## Development

Run `pnpm dev`, then open
[aaronwright-dot-ca.localhost](https://aaronwright-dot-ca.localhost). The local
router proxies to `127.0.0.1:3031`. `pnpm dev:lan` exposes that same port on a
trusted local network. Ordinary test commands do not start either server.

## Portfolio video compression

Keep an original recording outside `public/` and encode to a separate temporary
file before replacing the shipped asset. Install FFmpeg, including `ffprobe`,
and inspect the source first:

```sh
ffprobe -v error \
  -show_entries stream=codec_name,width,height,pix_fmt,avg_frame_rate \
  -show_entries format=duration,size -of json /path/to/original.mp4
```

Use H.264 MP4 at 30 fps with CRF 24, the `slow` preset, and `yuv420p` pixel format.
This keeps screen recordings reasonably small while retaining readable text and
broad browser compatibility. Remove audio for these muted portfolio loops.
`+faststart` places playback metadata at the front of the file so playback can
begin before the download finishes.

For Informal Systems, encode from the corrected iMovie export
(`Informal Systems Walkthrough - Edited White Background.mp4`). This
1920 × 1080 export has white padding around all four edges. Crop 188 px from
each side and 8 px from the top and bottom, producing 1544 × 1064 without
scaling the content. These bounds sit just inside the padding's antialiased
edges so the footage meets the portfolio frame without a white inset:

```sh
ffmpeg -hide_banner -i /path/to/original.mp4 \
  -an -vf 'crop=1544:1064:188:8,fps=30' \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
  -movflags +faststart /path/to/optimized.mp4
```

The recording's unwanted edge pixels and rounded window corners were removed
or filled with white before importing it into iMovie, and the source was padded
to 16:9 with white. Keep that order: iMovie's Cross Blur transitions spread any
black borders into the picture, so cropping the final export cannot fully remove
them. When preparing a replacement source for an existing edit, preserve its
duration, frame rate, and frame count so the cuts remain aligned.

The crop is specific to this recording. For a replacement with different framing,
inspect representative frames and adjust or remove `crop`, keeping `fps=30`.
Always encode from the original, rather than recompressing an already optimized
asset. Lower CRF values preserve more detail at a larger file size; review small
text and moving sections before increasing CRF to save more space.

Validate the output before copying it into `public/portfolio/<project>/`:

```sh
# Confirm dimensions, frame rate, duration, codec, and file size.
ffprobe -v error \
  -show_entries stream=codec_name,width,height,pix_fmt,avg_frame_rate \
  -show_entries format=duration,size -of json /path/to/optimized.mp4

# Decode the entire video; successful output is silent.
ffmpeg -v error -i /path/to/optimized.mp4 -f null -

# Extract a representative frame for visual comparison with the original.
ffmpeg -hide_banner -ss 20 -i /path/to/optimized.mp4 \
  -frames:v 1 /path/to/optimized-frame.png
```

Update the corresponding dimensions in `lib/portfolio.ts` to match the output.
For recordings with baked-in rounded corners, express the measured corner radius
as a fraction of the output width and height in `clip`; the shared media surface
uses those values to clip the content. Its outer frame thickness comes from
`--portfolio-media-frame-width`, independently of the recording's corner radius.
Preserve deferred loading: inactive, unvisited videos have no `src` and use
`preload="none"`; activation attaches the source and starts the muted inline loop.
Media changes require a fresh release QA report before publishing.

## Tests and release QA

- `pnpm test:unit`: fast Vitest checks for routing, gesture logic, media behavior,
  Markdown sanitization, metadata, and release-report validation.
- `PLAYWRIGHT_BASE_URL=<running-app-url> pnpm test:e2e`: the existing Playwright
  suite across desktop Chrome/Safari and iPhone portrait/landscape emulation.
- `pnpm qa:run`: build production, temporarily serve it on an available loopback port, run
  public-portfolio browser checks and measured visitor tasks, and save repo-local
  results. The command stops its own server when finished.
- `pnpm qa:check`: verify that the latest complete run matches this checkout and
  passes comparison with the explicitly accepted baseline. Netlify requires this.

See [TASKS.md](TASKS.md) for tasks, screen sizes, slow-device conditions, baseline
review, evidence files, and the agent-assisted exploratory workflow.
