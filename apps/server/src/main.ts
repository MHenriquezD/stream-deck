import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as os from 'os';
import * as path from 'path';
import { AppModule } from './app.module';

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaces = interfaces[name];
    if (!ifaces) continue;
    for (const iface of ifaces) {
      // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
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
    origin: true, // Permitir todos los orígenes (necesario para PWA en dispositivos móviles)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT ?? 8765;
  await app.listen(port, '0.0.0.0'); // Escuchar en todas las interfaces de red

  const localIp = getLocalIpAddress();

  console.log('');
  console.log('🚀 ====================================');
  console.log('   Stream Deck Server Started!');
  console.log('🚀 ====================================');
  console.log('');
  console.log(`📍 Local:    http://localhost:${port}`);
  console.log(`📱 Network:  http://${localIp}:${port}`);
  console.log('');
  console.log('💡 Para conectar desde otro dispositivo:');
  console.log(`   1. Abre la app PWA en tu tablet/móvil`);
  console.log(`   2. Ve a Configuración (⚙️)`);
  console.log(`   3. Ingresa: http://${localIp}:${port}`);
  console.log('');
}
bootstrap();
