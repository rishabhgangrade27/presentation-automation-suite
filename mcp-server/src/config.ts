import 'dotenv/config';

export const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5678').replace(/\/$/, '');

export const GENERATE_WEBHOOK_PATH = process.env.N8N_GENERATE_PATH || '/webhook/presenton/generate';
export const STATUS_WEBHOOK_PATH_PREFIX = process.env.N8N_STATUS_PATH_PREFIX || '/webhook/presenton/status';

export const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
export const MAX_WAIT_MS = Number(process.env.MAX_WAIT_MS || 5 * 60 * 1000);

export const HTTP_PORT = Number(process.env.PORT || 8787);
