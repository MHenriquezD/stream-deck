import { Controller, Get } from '@nestjs/common';
import * as os from 'os';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Sonda de arranque sin auth: la usa electron-main.mjs (waitForBackend)
   * para saber cuándo el backend ya acepta peticiones.
   */
  @Get('health')
  health() {
    return { status: 'ok' };
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
}
