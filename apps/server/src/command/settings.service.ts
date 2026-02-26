import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface AppSettings {
  gridSize: number;
  serverEnabled: boolean;
  buttonSound: boolean;
  buttonSoundFile: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  gridSize: 12,
  serverEnabled: true,
  buttonSound: true,
  buttonSoundFile: 'key-click.wav',
};

@Injectable()
export class SettingsService {
  private filePath = path.join(process.cwd(), 'data', 'settings.json');

  private ensureFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(DEFAULT_SETTINGS, null, 2),
      );
    }
  }

  getAll(): AppSettings {
    this.ensureFile();
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      return { ...DEFAULT_SETTINGS, ...data };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  getGridSize(): number {
    return this.getAll().gridSize;
  }

  setGridSize(gridSize: number) {
    const settings = this.getAll();
    settings.gridSize = gridSize;
    this.save(settings);
  }

  isServerEnabled(): boolean {
    return this.getAll().serverEnabled;
  }

  setServerEnabled(enabled: boolean) {
    const settings = this.getAll();
    settings.serverEnabled = enabled;
    this.save(settings);
  }

  getButtonSound(): boolean {
    return this.getAll().buttonSound;
  }

  setButtonSound(enabled: boolean) {
    const settings = this.getAll();
    settings.buttonSound = enabled;
    this.save(settings);
  }

  getButtonSoundFile(): string {
    return this.getAll().buttonSoundFile;
  }

  setButtonSoundFile(file: string) {
    const settings = this.getAll();
    settings.buttonSoundFile = file;
    this.save(settings);
  }

  private save(settings: AppSettings) {
    this.ensureFile();
    fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2));
  }
}
