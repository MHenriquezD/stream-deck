import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as os from 'os';
import * as path from 'path';
import { AppModule } from './app.module';

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const ifaces = interfaces[name];
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips.length > 0 ? ips[0] : 'localhost';
}

function getAllLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const ifaces = interfaces[name];
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

async function bootstrap() {
  // Crear app HTTP sin HTTPS en desarrollo
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Servir archivos estáticos de la carpeta downloads
  const downloadsPath = path.join(
    process.cwd(),
    'apps',
    'web',
    'public',
    'downloads',
  );
  app.useStaticAssets(downloadsPath, {
    prefix: '/downloads/',
  });

  // Habilitar CORS para permitir conexiones desde cualquier origen en la red local
  app.enableCors({
    origin: '*',
  });

  const httpPort = process.env.PORT ?? 7500;
  const localIp = getLocalIpAddress();
  const allIps = getAllLocalIpAddresses();

  await app.listen(httpPort, '0.0.0.0');

  console.log('');
  console.log('🚀 ====================================');
  console.log('   Stream Deck Server Started! 🔓');
  console.log('🚀 ====================================');
  console.log('');
  console.log(`📍 Local:    http://localhost:${httpPort}`);
  allIps.forEach((ip) => {
    console.log(`📱 Network:  http://${ip}:${httpPort}`);
  });
  console.log('');
  console.log('💡 Conecta desde tu app Electron:');
  console.log(`   - http://localhost:${httpPort}`);
  console.log('');
}
bootstrap().catch((err) => {
  console.error('Error during server bootstrap:', err);
});
