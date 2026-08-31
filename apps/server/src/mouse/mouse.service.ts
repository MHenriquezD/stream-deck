import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * nut-js se carga con `import()` dinámico porque trae binarios nativos y no
 * siempre está disponible (headless, permisos, arquitectura). El tipo se saca
 * del propio paquete y es solo de tipos, así que no fuerza la carga.
 */
type NutModule = typeof import('@nut-tree-fork/nut-js');
type KeyName = keyof NutModule['Key'];

@Injectable()
export class MouseService implements OnModuleInit {
  /** null mientras no se haya cargado nut-js, o si no está disponible. */
  private nut: NutModule | null = null;
  private readonly logger = new Logger(MouseService.name);

  async onModuleInit() {
    try {
      const nut = await import('@nut-tree-fork/nut-js');
      // Sin auto-highlight ni cámara lenta.
      nut.mouse.config.autoDelayMs = 0;
      nut.mouse.config.mouseSpeed = 2000;
      nut.keyboard.config.autoDelayMs = 0;
      this.nut = nut;
      this.logger.debug('Mouse controller inicializado');
    } catch (e) {
      this.logger.warn(`Mouse controller no disponible: ${String(e)}`);
      this.nut = null;
    }
  }

  isAvailable(): boolean {
    return this.nut !== null;
  }

  /** Move mouse by relative delta (dx, dy) */
  async move(dx: number, dy: number): Promise<void> {
    if (!this.nut) return;
    try {
      const { mouse } = this.nut;
      const pos = await mouse.getPosition();
      await mouse.setPosition({ x: pos.x + dx, y: pos.y + dy });
    } catch {
      // Ignore errors (e.g. out of screen bounds)
    }
  }

  /** Click left mouse button */
  async clickLeft(): Promise<void> {
    if (!this.nut) return;
    await this.nut.mouse.click(this.nut.Button.LEFT);
  }

  /** Click right mouse button */
  async clickRight(): Promise<void> {
    if (!this.nut) return;
    await this.nut.mouse.click(this.nut.Button.RIGHT);
  }

  /** Double click left button */
  async doubleClick(): Promise<void> {
    if (!this.nut) return;
    await this.nut.mouse.doubleClick(this.nut.Button.LEFT);
  }

  /** Scroll up/down (positive = down, negative = up) */
  async scroll(amount: number): Promise<void> {
    if (!this.nut) return;
    const { mouse } = this.nut;
    try {
      if (amount > 0) {
        await mouse.scrollDown(Math.abs(amount));
      } else {
        await mouse.scrollUp(Math.abs(amount));
      }
    } catch {
      // ignore
    }
  }

  /** Scroll left/right (positive = right, negative = left) */
  async scrollHorizontal(amount: number): Promise<void> {
    if (!this.nut) return;
    const { mouse } = this.nut;
    try {
      if (amount > 0) {
        await mouse.scrollRight(Math.abs(amount));
      } else {
        await mouse.scrollLeft(Math.abs(amount));
      }
    } catch {
      // ignore
    }
  }

  /** Press and hold left button (start drag) */
  async pressDown(): Promise<void> {
    if (!this.nut) return;
    await this.nut.mouse.pressButton(this.nut.Button.LEFT);
  }

  /** Release left button (end drag) */
  async pressUp(): Promise<void> {
    if (!this.nut) return;
    await this.nut.mouse.releaseButton(this.nut.Button.LEFT);
  }

  /** Type text string */
  async typeText(text: string): Promise<void> {
    if (!this.nut) return;
    await this.nut.keyboard.type(text);
  }

  /** Press a special key by name */
  async pressKey(keyName: string): Promise<void> {
    if (!this.nut) return;
    const key = this.resolveKey(keyName);
    if (key === undefined) return;
    await this.nut.keyboard.pressKey(key);
    await this.nut.keyboard.releaseKey(key);
  }

  /** Press key combination (e.g., ['LeftControl', 'C'] for Ctrl+C) */
  async pressKeyCombination(keyNames: string[]): Promise<void> {
    if (!this.nut) return;
    const { keyboard } = this.nut;
    const keys = keyNames
      .map((name) => this.resolveKey(name))
      .filter((k) => k !== undefined);
    if (keys.length === 0) return;

    for (const key of keys) {
      await keyboard.pressKey(key);
    }
    // Release in reverse order
    for (const key of keys.reverse()) {
      await keyboard.releaseKey(key);
    }
  }

  /**
   * Traduce el nombre que manda el cliente a la constante de nut-js. Es
   * entrada externa, así que se comprueba que la clave exista de verdad.
   */
  private resolveKey(keyName: string): NutModule['Key'][KeyName] | undefined {
    if (!this.nut) return undefined;
    const Key = this.nut.Key;
    return Object.prototype.hasOwnProperty.call(Key, keyName)
      ? Key[keyName as KeyName]
      : undefined;
  }
}
