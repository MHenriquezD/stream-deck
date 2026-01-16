import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
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
  // Verificar si existen certificados SSL (cert.pem y key.pem)
  const certPath = path.join(process.cwd(), 'certs', 'cert.pem');
  const keyPath = path.join(process.cwd(), 'certs', 'key.pem');

  // Siempre crear la app sin httpsOptions (HTTP)
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

  // --- Levantar HTTP y HTTPS en paralelo ---
  const httpPort = 7500;
  const httpsPort = 8765;
  const localIp = getLocalIpAddress();
  const allIps = getAllLocalIpAddresses();

  // HTTP
  app.listen(httpPort, '0.0.0.0').then(() => {
    console.log('');
    console.log('🚀 ====================================');
    console.log('   Stream Deck Server Started! 🔓 (HTTP)');
    console.log('🚀 ====================================');
    console.log('');
    console.log(`📍 Local:    http://localhost:${httpPort}`);
    allIps.forEach((ip) => {
      console.log(`📱 Network:  http://${ip}:${httpPort}`);
    });
    console.log('');
    console.log('💡 Para conectar desde otro dispositivo:');
    allIps.forEach((ip) => {
      console.log(`   - Ingresa: http://${ip}:${httpPort}`);
    });
    console.log('');
  });

  // HTTPS (si hay certificados)
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    NestFactory.create<NestExpressApplication>(AppModule, {
      httpsOptions,
    }).then(async (secureApp) => {
      secureApp.useStaticAssets(downloadsPath, { prefix: '/downloads/' });
      secureApp.enableCors({ origin: '*' });
      await secureApp.listen(httpsPort, '0.0.0.0');
      console.log('');
      console.log('🚀 ====================================');
      console.log('   Stream Deck Server Started! 🔒 (HTTPS)');
      console.log('🚀 ====================================');
      console.log('');
      console.log('✅ HTTPS habilitado con certificados SSL');
      console.log('');
      console.log(`📍 Local:    https://localhost:${httpsPort}`);
      allIps.forEach((ip) => {
        console.log(`📱 Network:  https://${ip}:${httpsPort}`);
      });
      console.log('');
      console.log('💡 Para conectar desde otro dispositivo:');
      allIps.forEach((ip) => {
        console.log(`   - Ingresa: https://${ip}:${httpsPort}`);
      });
      console.log('');
    });
  }
}
bootstrap().catch((err) => {
  console.error('Error during server bootstrap:', err);
});
