// Highway Run — a GTA-style cover maker, handed in as a make.fun entry.
// main.ts (Node 22, standard library only) gathers the entry: it copies this repository's
// app/ and screenshots/ into the output directory and writes dossier.json there, using the
// vendored make.fun library to build the dossier. The grader runs it with /output as the
// destination; locally, MAKEFUN_OUTPUT_DIR takes that place, e.g.
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The app itself is plain static files under app/ (index.html plus its scripts and styles)
// that run offline in a desktop browser with no network request.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Caps from the scorer's gate: the dossier text budget, and the limits an entry the scorer
// would refuse (more than 4 screenshots, one over 256 KiB; app/ over 993 files or 48 MiB,
// or a path under app/ over 1000 bytes). /output itself caps at 1000 entries and 64 MiB,
// shared by app/, screenshots/ and dossier.json, so app/ leaves them room.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
