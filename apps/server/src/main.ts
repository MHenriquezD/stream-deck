import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
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
  // Verificar si existen certificados SSL (cert.pem y key.pem)
  const certPath = path.join(process.cwd(), 'certs', 'cert.pem');
  const keyPath = path.join(process.cwd(), 'certs', 'key.pem');
  let app: NestExpressApplication;
  let useHttps = false;
  let httpsOptions: { key: Buffer; cert: Buffer } | undefined = undefined;
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    useHttps = true;
  }
  if (httpsOptions) {
    app = await NestFactory.create<NestExpressApplication>(AppModule, {
      httpsOptions,
    });
  } else {
    app = await NestFactory.create<NestExpressApplication>(AppModule);
  }

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
    origin: '*', // Permitir todos los orígenes (necesario para PWA en dispositivos móviles)
    // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    // credentials: true,
  });

  const port = process.env.PORT ?? 8765;
  await app.listen(port, '0.0.0.0'); // Escuchar en todas las interfaces de red

  const localIp = getLocalIpAddress();
  const protocol = useHttps ? 'https' : 'http';
  const secureIcon = useHttps ? '🔒' : '🔓';

  console.log('');
  console.log('🚀 ====================================');
  console.log(`   Stream Deck Server Started! ${secureIcon}`);
  console.log('🚀 ====================================');
  console.log('');
  if (useHttps) {
    console.log('✅ HTTPS habilitado con certificados SSL');
    console.log('');
  }
  console.log(`📍 Local:    ${protocol}://localhost:${port}`);
  console.log(`📱 Network:  ${protocol}://${localIp}:${port}`);
  console.log('');
  console.log('💡 Para conectar desde otro dispositivo:');
  console.log(`   1. Abre la app PWA en tu tablet/móvil`);
  console.log(`   2. Ve a Configuración (⚙️)`);
  console.log(`   3. Ingresa: ${protocol}://${localIp}:${port}`);
  console.log('');
}
bootstrap().catch((err) => {
  console.error('Error during server bootstrap:', err);
});
