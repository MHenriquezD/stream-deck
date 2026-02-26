import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class MouseService implements OnModuleInit {
  private mouse: any = null;
  private keyboard: any = null;
  private Button: any = null;
  private Key: any = null;
  private available = false;

  async onModuleInit() {
    try {
      const nut = await import('@nut-tree-fork/nut-js');
      this.mouse = nut.mouse;
      this.keyboard = nut.keyboard;
      this.Button = nut.Button;
      this.Key = nut.Key;
      // Disable auto-highlight and slow motion
      this.mouse.config.autoDelayMs = 0;
      this.mouse.config.mouseSpeed = 2000;
      this.keyboard.config.autoDelayMs = 0;
      this.available = true;
      console.log('🖱️ Mouse controller inicializado');
    } catch (e) {
      console.warn('⚠️ Mouse controller no disponible:', e);
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  /** Move mouse by relative delta (dx, dy) */
  async move(dx: number, dy: number): Promise<void> {
    if (!this.available) return;
    try {
      const pos = await this.mouse.getPosition();
      await this.mouse.setPosition({
        x: pos.x + dx,
        y: pos.y + dy,
      });
    } catch (e) {
      // Ignore errors (e.g. out of screen bounds)
    }
  }

  /** Click left mouse button */
  async clickLeft(): Promise<void> {
    if (!this.available) return;
    await this.mouse.click(this.Button.LEFT);
  }

  /** Click right mouse button */
  async clickRight(): Promise<void> {
    if (!this.available) return;
    await this.mouse.click(this.Button.RIGHT);
  }

  /** Double click left button */
  async doubleClick(): Promise<void> {
    if (!this.available) return;
    await this.mouse.doubleClick(this.Button.LEFT);
  }

  /** Scroll up/down (positive = down, negative = up) */
  async scroll(amount: number): Promise<void> {
    if (!this.available) return;
    try {
      if (amount > 0) {
        await this.mouse.scrollDown(Math.abs(amount));
      } else {
        await this.mouse.scrollUp(Math.abs(amount));
      }
    } catch {
      // ignore
    }
  }

  /** Scroll left/right (positive = right, negative = left) */
  async scrollHorizontal(amount: number): Promise<void> {
    if (!this.available) return;
    try {
      if (amount > 0) {
        await this.mouse.scrollRight(Math.abs(amount));
      } else {
        await this.mouse.scrollLeft(Math.abs(amount));
      }
    } catch {
      // ignore
    }
  }

  /** Press and hold left button (start drag) */
  async pressDown(): Promise<void> {
    if (!this.available) return;
    await this.mouse.pressButton(this.Button.LEFT);
  }

  /** Release left button (end drag) */
  async pressUp(): Promise<void> {
    if (!this.available) return;
    await this.mouse.releaseButton(this.Button.LEFT);
  }

  /** Type text string */
  async typeText(text: string): Promise<void> {
    if (!this.available) return;
    await this.keyboard.type(text);
  }

  /** Press a special key by name */
  async pressKey(keyName: string): Promise<void> {
    if (!this.available) return;
    const key = this.Key[keyName];
    if (key !== undefined) {
      await this.keyboard.pressKey(key);
      await this.keyboard.releaseKey(key);
    }
  }

  /** Press key combination (e.g., ['LeftControl', 'C'] for Ctrl+C) */
  async pressKeyCombination(keyNames: string[]): Promise<void> {
    if (!this.available) return;
    const keys = keyNames
      .map((name) => this.Key[name])
      .filter((k) => k !== undefined);
    if (keys.length > 0) {
      // Press all keys
      for (const key of keys) {
        await this.keyboard.pressKey(key);
      }
      // Release in reverse order
      for (const key of keys.reverse()) {
        await this.keyboard.releaseKey(key);
      }
    }
  }
}
