import { ControlPolicy } from '../../../shared/types';

export const disconnectTimers = new Map<string, NodeJS.Timeout>();
export const bufferingTimers = new Map<string, NodeJS.Timeout>();
export const lastReactionTimes = new Map<string, number>();
export const pinAttemptTimes = new Map<string, number[]>();
export const lastChatTimes = new Map<string, number[]>();
export const reconnectTokens = new Map<string, { roomId: string; nickname: string; role: 'host' | 'viewer' }>();
export const socketToToken = new Map<string, string>();
export const socketToRoom = new Map<string, string>();

export const MAX_NICKNAME_LENGTH = 50;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_WINDOW_MS = 60_000;
export const MAX_CHAT_PER_WINDOW = 5;
export const CHAT_WINDOW_MS = 3_000;
export const MAX_FILE_NAME_LENGTH = 255;
export const VALID_HASH_RE = /^[0-9a-f]{64}$/i; // SHA-256 hex string
export const VALID_CONTROL_POLICIES: ControlPolicy[] = ['host_only', 'everyone', 'selected'];
