/**
 * Central place for all magic numbers and string constants.
 * Change here — takes effect everywhere.
 */

export const HOVER_DEBOUNCE_MS = 400;
export const MIN_CALL_GAP_MS = 8000;
export const RATE_LIMIT_COOLDOWN_MS = 56000;
export const CACHE_TTL_SECONDS = 300;
export const CACHE_MAX_ENTRIES = 500;
export const MIN_WORD_LENGTH = 2;
export const SURROUNDING_LINES = 3;

export const CONFIG_SECTION = "aiHover";
export const CONFIG_KEY_ENABLED = "enabled";
export const CONFIG_KEY_SERVER_URL = "ollamaUrl";
export const CONFIG_KEY_MODEL = "model";

export const DEFAULT_OLLAMA_URL = "http://localhost:11434/v1";
export const DEFAULT_MODEL = "qwen2.5-coder:3b";
