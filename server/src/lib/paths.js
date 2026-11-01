import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '../..');
// Photographs are stored in MongoDB (see models PupilPhoto), not on disk.
export const OUTPUT_DIR = path.join(SERVER_ROOT, 'output');
export const FRONTEND_DIST = path.resolve(SERVER_ROOT, '..', 'dist');
