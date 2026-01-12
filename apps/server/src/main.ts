import { NestFactory } from '@nestjs/core';
import * as os from 'os';
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
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir conexiones desde cualquier origen en la red local
  app.enableCors({
    origin: true, // Permitir todos los orígenes (necesario para PWA en dispositivos móviles)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
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
