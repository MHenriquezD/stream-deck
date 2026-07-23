import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/** Tracks failed login attempts and lockout state for a single origin (IP). */
interface AttemptRecord {
  failures: number;
  /** Epoch ms until which this origin is locked out (0 = not locked). */
  lockedUntil: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private settingsPath = path.join(process.cwd(), 'data', 'settings.json');
  private sessionsPath = path.join(process.cwd(), 'data', 'sessions.json');
  /** token → epoch ms at which the session expires. */
  private activeSessions = new Map<string, number>();

  // ─── Sessions ───
  /** How long a session token stays valid after it is issued. */
  private static readonly SESSION_TTL_MS = 7 * 24 * 60 * 60_000; // 7 días

  // ─── Rate limiting (brute-force protection) ───
  /** After this many consecutive failures an origin gets locked out. */
  private static readonly MAX_ATTEMPTS = 5;
  /** Base lockout in ms; doubles for each lockout beyond the first. */
  private static readonly BASE_LOCKOUT_MS = 30_000; // 30s
  /** Cap on a single lockout window. */
  private static readonly MAX_LOCKOUT_MS = 15 * 60_000; // 15 min
  private attempts = new Map<string, AttemptRecord>();

  // ─── PIN hashing (scrypt) ───
  private static readonly SCRYPT_KEYLEN = 64;

  constructor() {
    // Restore sessions from disk on startup
    this.loadSessions();
  }

  /** Check if a PIN has been configured */
  isPinConfigured(): boolean {
    const settings = this.readSettings();
    return !!settings.pinHash || !!settings.pin;
  }

  /** Set or change the PIN. Returns a session token (auto-login for the setter) */
  setPin(pin: string): { success: boolean; token: string } {
    const settings = this.readSettings();
    settings.pinHash = this.hashPin(pin);
    // Remove any legacy plaintext PIN.
    delete settings.pin;
    this.writeSettings(settings);
    // A new PIN invalidates every existing session and any lockout state.
    this.activeSessions.clear();
    this.attempts.clear();
    // Auto-authenticate the client that set the PIN
    const token = this.createSession();
    return { success: true, token };
  }

  /**
   * Validate a PIN and return a session token if correct.
   * @param origin An identifier for the caller (e.g. client IP) used for
   *   per-origin brute-force rate limiting.
   */
  login(
    pin: string,
    origin = 'unknown',
  ): { success: boolean; token?: string; message?: string } {
    const lock = this.checkLockout(origin);
    if (lock.locked) {
      return {
        success: false,
        message: `Demasiados intentos. Inténtalo de nuevo en ${lock.secondsLeft}s`,
      };
    }

    const settings = this.readSettings();
    if (!settings.pinHash && !settings.pin) {
      return { success: false, message: 'No hay PIN configurado' };
    }

    if (this.verifyPin(pin, settings)) {
      this.clearAttempts(origin);
      const token = this.createSession();
      return { success: true, token };
    }

    const remaining = this.registerFailure(origin);
    const message =
      remaining > 0
        ? `PIN incorrecto. Te quedan ${remaining} intento(s)`
        : 'PIN incorrecto';
    return { success: false, message };
  }

  /** Check if a token is valid and not expired. */
  validateToken(token: string): boolean {
    const expiresAt = this.activeSessions.get(token);
    if (expiresAt === undefined) return false;
    if (Date.now() >= expiresAt) {
      // Expired: drop it so it can't be reused.
      this.activeSessions.delete(token);
      this.saveSessions();
      return false;
    }
    return true;
  }

  /** Remove a session token */
  logout(token: string) {
    if (this.activeSessions.delete(token)) {
      this.saveSessions();
    }
  }

  /** Issue a new session token with a fresh expiry and persist it. */
  private createSession(): string {
    this.pruneExpired();
    const token = crypto.randomUUID();
    this.activeSessions.set(token, Date.now() + AuthService.SESSION_TTL_MS);
    this.saveSessions();
    return token;
  }

  /** Remove every expired session. Returns how many were removed. */
  private pruneExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [token, expiresAt] of this.activeSessions) {
      if (now >= expiresAt) {
        this.activeSessions.delete(token);
        removed++;
      }
    }
    return removed;
  }

  // ─── PIN hashing helpers ───

  /** Produce a `salt:hash` string using scrypt. */
  private hashPin(pin: string): string {
    const salt = crypto.randomBytes(16);
    const derived = crypto.scryptSync(pin, salt, AuthService.SCRYPT_KEYLEN);
    return `${salt.toString('hex')}:${derived.toString('hex')}`;
  }

  /**
   * Verify a PIN against stored settings. Supports legacy plaintext PINs,
   * transparently upgrading them to a hash on first successful login.
   */
  private verifyPin(pin: string, settings: Record<string, any>): boolean {
    if (settings.pinHash) {
      return this.verifyHash(pin, settings.pinHash);
    }

    // Legacy plaintext PIN — compare in constant time, then migrate to a hash.
    if (settings.pin) {
      const a = Buffer.from(String(pin));
      const b = Buffer.from(String(settings.pin));
      const match = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (match) {
        settings.pinHash = this.hashPin(pin);
        delete settings.pin;
        this.writeSettings(settings);
        this.logger.log('PIN heredado en texto plano migrado a hash scrypt');
      }
      return match;
    }

    return false;
  }

  /** Constant-time verification of a PIN against a stored `salt:hash`. */
  private verifyHash(pin: string, stored: string): boolean {
    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(pin, salt, expected.length);
    return (
      derived.length === expected.length &&
      crypto.timingSafeEqual(derived, expected)
    );
  }

  // ─── Rate limiting helpers ───

  private checkLockout(origin: string): {
    locked: boolean;
    secondsLeft: number;
  } {
    const record = this.attempts.get(origin);
    if (!record || record.lockedUntil === 0) {
      return { locked: false, secondsLeft: 0 };
    }
    const now = Date.now();
    if (now >= record.lockedUntil) {
      // Lockout expired: reset the failure counter so counting starts fresh.
      record.lockedUntil = 0;
      record.failures = 0;
      return { locked: false, secondsLeft: 0 };
    }
    return {
      locked: true,
      secondsLeft: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  /** Record a failed attempt; returns attempts left before lockout. */
  private registerFailure(origin: string): number {
    const record = this.attempts.get(origin) ?? {
      failures: 0,
      lockedUntil: 0,
    };
    record.failures += 1;

    if (record.failures >= AuthService.MAX_ATTEMPTS) {
      // Escalate lockout window with each additional lockout beyond the first.
      const overflow = record.failures - AuthService.MAX_ATTEMPTS;
      const lockout = Math.min(
        AuthService.BASE_LOCKOUT_MS * 2 ** overflow,
        AuthService.MAX_LOCKOUT_MS,
      );
      record.lockedUntil = Date.now() + lockout;
      this.logger.warn(
        `Origen ${origin} bloqueado ${Math.round(lockout / 1000)}s tras ${record.failures} intentos fallidos`,
      );
    }

    this.attempts.set(origin, record);
    return Math.max(0, AuthService.MAX_ATTEMPTS - record.failures);
  }

  private clearAttempts(origin: string) {
    this.attempts.delete(origin);
  }

  // ─── Persistence ───

  private loadSessions() {
    try {
      if (!fs.existsSync(this.sessionsPath)) return;
      const data = JSON.parse(fs.readFileSync(this.sessionsPath, 'utf-8'));

      if (Array.isArray(data)) {
        // Legacy format: array of tokens with no expiry. Give each a fresh TTL
        // so existing sessions keep working but now expire.
        const expiresAt = Date.now() + AuthService.SESSION_TTL_MS;
        for (const token of data) {
          if (typeof token === 'string') {
            this.activeSessions.set(token, expiresAt);
          }
        }
      } else if (data && typeof data === 'object') {
        // Current format: { token: expiresAtEpochMs }.
        for (const [token, expiresAt] of Object.entries(data)) {
          if (typeof expiresAt === 'number') {
            this.activeSessions.set(token, expiresAt);
          }
        }
      }

      const removed = this.pruneExpired();
      if (removed > 0) {
        this.logger.log(`${removed} sesión(es) expirada(s) descartada(s)`);
        this.saveSessions();
      }
    } catch (err) {
      this.logger.warn(`No se pudieron cargar las sesiones: ${err}`);
    }
  }

  private saveSessions() {
    try {
      const dir = path.dirname(this.sessionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serialized = Object.fromEntries(this.activeSessions);
      fs.writeFileSync(
        this.sessionsPath,
        JSON.stringify(serialized, null, 2),
      );
    } catch (err) {
      this.logger.warn(`No se pudieron guardar las sesiones: ${err}`);
    }
  }

  private readSettings(): Record<string, any> {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.settingsPath)) {
        return JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'));
      }
    } catch (err) {
      this.logger.warn(`No se pudo leer settings.json: ${err}`);
    }
    return {};
  }

  private writeSettings(settings: Record<string, any>) {
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
  }
}
