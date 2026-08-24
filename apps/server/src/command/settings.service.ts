import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { JsonStore } from '../common/json-store';

export interface AppSettings {
  serverEnabled: boolean;
  buttonSound: boolean;
  buttonSoundFile: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  serverEnabled: true,
  buttonSound: true,
  buttonSoundFile: 'key-click.wav',
};

@Injectable()
export class SettingsService {
  private filePath = path.join(process.cwd(), 'data', 'settings.json');

  async getAll(): Promise<AppSettings> {
    // El fichero settings.json lo comparte auth.service (guarda el pinHash),
    // por eso conservamos las claves desconocidas al leer.
    const data = await JsonStore.read<Record<string, unknown>>(
      this.filePath,
      {},
    );
    return { ...DEFAULT_SETTINGS, ...data };
  }

  async isServerEnabled(): Promise<boolean> {
    return (await this.getAll()).serverEnabled;
  }

  async setServerEnabled(enabled: boolean): Promise<void> {
    await this.patch({ serverEnabled: enabled });
  }

  async getButtonSound(): Promise<boolean> {
    return (await this.getAll()).buttonSound;
  }

  async setButtonSound(enabled: boolean): Promise<void> {
    await this.patch({ buttonSound: enabled });
  }

  async getButtonSoundFile(): Promise<string> {
    return (await this.getAll()).buttonSoundFile;
  }

  async setButtonSoundFile(file: string): Promise<void> {
    await this.patch({ buttonSoundFile: file });
  }

  /**
   * Aplica un cambio parcial mediante un read-modify-write atómico y
   * serializado. Preserva las claves ajenas (p. ej. pinHash de auth) porque
   * parte del contenido real del fichero, no de AppSettings.
   */
  private async patch(changes: Partial<AppSettings>): Promise<void> {
    await JsonStore.update<Record<string, unknown>>(
      this.filePath,
      {},
      (current) => ({ ...current, ...changes }),
    );
  }
}
