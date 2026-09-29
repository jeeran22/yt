/**
 * Stand-in for the ffmpeg binary used by tests/smoke.js.
 *
 * The smoke suite points FFMPEG_PATH at this script so the stitch service
 * can be exercised end-to-end without a real ffmpeg install. It mimics the
 * only contract the service relies on: write *something* to the output path
 * (the final non-flag argument) and exit with status 0.
 */
const fs = require('node:fs');

const args = process.argv.slice(2);

// ffmpeg convention: the last argument that is not a flag is the output file
let output = null;
for (const arg of args) {
  if (!arg.startsWith('-')) {
    output = arg;
  }
}

if (!output) {
  console.error('stub-ffmpeg: no output file argument found');
  process.exit(1);
}

// A real MP4 header-ish prefix + some bytes so the response "looks" like media
fs.writeFileSync(output, Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), // ftyp box
  Buffer.from(`stubbed-mp4-output-${Date.now()}`)
]));

process.exit(0);