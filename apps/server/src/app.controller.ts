import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('network-info')
  getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        // Skip internal and non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }

    // Priorizar IPs de redes privadas comunes
    // Orden: 192.168.x.x, 172.16-31.x.x, 10.x.x.x, otras
    const priorityIP =
      addresses.find((ip) => ip.startsWith('192.168.')) ||
      addresses.find((ip) => {
        const parts = ip.split('.');
        return (
          parts[0] === '172' &&
          parseInt(parts[1]) >= 16 &&
          parseInt(parts[1]) <= 31
        );
      }) ||
      addresses.find((ip) => ip.startsWith('10.')) ||
      addresses[0];

    const selectedIP = priorityIP || 'No disponible';

    return {
      localIP: selectedIP,
      allIPs: addresses,
      port: 8765,
      url: selectedIP !== 'No disponible' ? `http://${selectedIP}:8765` : null,
    };
  }

  @Get('downloads/list')
  getDownloadsList() {
    try {
      // La carpeta downloads está en apps/web/public/downloads
      const downloadsPath = path.join(
        process.cwd(),
        'apps',
        'web',
        'public',
        'downloads',
      );

      console.log('Buscando archivos en:', downloadsPath);

      if (!fs.existsSync(downloadsPath)) {
        console.log('La carpeta no existe:', downloadsPath);
        return { files: [] };
      }

      const files = fs.readdirSync(downloadsPath);
      console.log('Archivos encontrados:', files);

      const fileDetails = files.map((file) => {
        const filePath = path.join(downloadsPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          sizeFormatted: this.formatFileSize(stats.size),
          url: `/downloads/${file}`,
        };
      });

      return { files: fileDetails };
    } catch (error) {
      console.error('Error listing downloads:', error);
      return { files: [] };
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
