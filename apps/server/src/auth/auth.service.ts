import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService {
  private settingsPath = path.join(process.cwd(), 'data', 'settings.json');
  private sessionsPath = path.join(process.cwd(), 'data', 'sessions.json');
  private activeSessions = new Set<string>();

  constructor() {
    // Restore sessions from disk on startup
    this.loadSessions();
  }

  /** Check if a PIN has been configured */
  isPinConfigured(): boolean {
    const settings = this.readSettings();
    return !!settings.pin;
  }

  /** Get the current PIN */
  getPin(): string | null {
    const settings = this.readSettings();
    return settings.pin || null;
  }

  /** Set or change the PIN. Returns a session token (auto-login for the setter) */
  setPin(pin: string): { success: boolean; token: string } {
    const settings = this.readSettings();
    settings.pin = pin;
    this.writeSettings(settings);
    // Invalidate all existing sessions when PIN changes
    this.activeSessions.clear();
    // Auto-authenticate the client that set the PIN
    const token = crypto.randomUUID();
    this.activeSessions.add(token);
    this.saveSessions();
    return { success: true, token };
  }

  /** Validate a PIN and return a session token if correct */
  login(pin: string): { success: boolean; token?: string; message?: string } {
    const currentPin = this.getPin();
    if (!currentPin) {
      return { success: false, message: 'No hay PIN configurado' };
    }
    if (pin === currentPin) {
      const token = crypto.randomUUID();
      this.activeSessions.add(token);
      this.saveSessions();
      return { success: true, token };
    }
    return { success: false, message: 'PIN incorrecto' };
  }

  /** Check if a token is valid */
  validateToken(token: string): boolean {
    return this.activeSessions.has(token);
  }

  /** Remove a session token */
  logout(token: string) {
    this.activeSessions.delete(token);
    this.saveSessions();
  }

  private loadSessions() {
    try {
      if (fs.existsSync(this.sessionsPath)) {
        const data = JSON.parse(fs.readFileSync(this.sessionsPath, 'utf-8'));
        if (Array.isArray(data)) {
          this.activeSessions = new Set(data);
        }
      }
    } catch {
      // ignore — start with empty sessions
    }
  }

  private saveSessions() {
    try {
      const dir = path.dirname(this.sessionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.sessionsPath,
        JSON.stringify([...this.activeSessions], null, 2),
      );
    } catch {
      // ignore
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
    } catch {
      // ignore
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
