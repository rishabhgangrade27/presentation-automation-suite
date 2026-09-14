import 'dotenv/config';

// Default port 5679 (not 5678) deliberately: this project runs its own isolated
// n8n instance so it never collides with an n8n you already have running elsewhere.
export const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5679').replace(/\/$/, '');

export const GENERATE_WEBHOOK_PATH = process.env.N8N_GENERATE_PATH || '/webhook/presenton/generate';
export const STATUS_WEBHOOK_PATH_PREFIX = process.env.N8N_STATUS_PATH_PREFIX || '/webhook/presenton/status';

export const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
export const MAX_WAIT_MS = Number(process.env.MAX_WAIT_MS || 5 * 60 * 1000);

export const HTTP_PORT = Number(process.env.PORT || 8787);
