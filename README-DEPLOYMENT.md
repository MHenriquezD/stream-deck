# 🎮 Stream Deck Personal - PWA

Stream Deck personal para controlar tu PC desde cualquier dispositivo (tablet, móvil, o navegador).

## ✨ Características

- 🎯 **Control remoto**: Ejecuta comandos en tu PC desde cualquier dispositivo
- 📱 **PWA**: Instala la app en tu tablet o móvil como una app nativa
- 🎨 **Personalizable**: Botones con iconos, colores y comandos personalizados
- 🌓 **Tema claro/oscuro**: Cambia entre temas según tu preferencia
- 🔄 **Drag & Drop**: Reorganiza los botones arrastrándolos
- 🎵 **Comandos multimedia**: Controla volumen, reproducción, etc.
- 🪟 **Apps de Windows**: Acceso rápido a tus aplicaciones instaladas

## 🚀 Instalación y Uso

### Opción 1: Desarrollo (Recomendada)

#### 1. Instalar dependencias

```bash
pnpm install
```

#### 2. Iniciar el proyecto

```bash
pnpm run dev
```

Esto iniciará:

- **Backend** en `http://localhost:3000`
- **Frontend** en `http://localhost:5173`

#### 3. Conectar desde otro dispositivo

El servidor mostrará en consola algo como:

```
🚀 ====================================
   Stream Deck Server Started!
🚀 ====================================

📍 Local:    http://localhost:3000
📱 Network:  http://192.168.1.100:3000

💡 Para conectar desde otro dispositivo:
   1. Abre la app PWA en tu tablet/móvil
   2. Ve a Configuración (⚙️)
   3. Ingresa: http://192.168.1.100:3000
```

En tu tablet/móvil:

1. Abre el navegador y ve a `http://[IP-DE-TU-PC]:5173`
2. Haz clic en el botón ⚙️ (Configuración)
3. Ingresa la IP del servidor: `http://192.168.1.100:3000`
4. Haz clic en "Probar Conexión" para verificar
5. Guarda y recarga

#### 4. Instalar como PWA

En tu dispositivo móvil/tablet:

- **Android Chrome**: Menú → "Agregar a pantalla de inicio"
- **iOS Safari**: Botón compartir → "Agregar a pantalla de inicio"
- **Desktop**: Icono de instalación en la barra de direcciones

### Opción 2: Build y Distribución

#### Generar build de producción

```bash
# Build del frontend (PWA)
cd apps/web
pnpm run build

# El build estará en apps/web/dist/
# Puedes servirlo con cualquier servidor estático
```

#### Crear servidor portable

```bash
cd apps/server
.\build-portable.ps1
```

Esto generará una carpeta `StreamDeck-Server-Portable` con:

- Ejecutable standalone del servidor
- Script `START-SERVER.bat` para iniciar fácilmente
- Carpeta `data` para almacenar configuraciones
- README con instrucciones

**Para distribuir:**

1. Comprime la carpeta `StreamDeck-Server-Portable` en un ZIP
2. El usuario solo necesita:
   - Tener Node.js instalado
   - Descomprimir el ZIP
   - Ejecutar `START-SERVER.bat`

## 📁 Estructura del Proyecto

```
stream-deck/
├── apps/
│   ├── server/          # Backend NestJS
│   │   ├── src/
│   │   └── build-portable.ps1
│   └── web/             # Frontend Vue 3 + PWA
│       ├── src/
│       └── public/
├── packages/
│   └── shared/          # Tipos compartidos
└── pnpm-workspace.yaml
```

## 🛠️ Tecnologías

### Frontend

- Vue 3 (Composition API)
- TypeScript
- Vite + vite-plugin-pwa
- PrimeVue (UI components)
- Pinia (State management)

### Backend

- NestJS
- TypeScript
- PowerShell (para ejecutar comandos en Windows)

## 🔧 Configuración

### Variables de entorno

#### Backend (`apps/server/.env`)

```env
PORT=3000
```

#### Frontend

La URL del servidor se configura desde la UI (botón ⚙️) y se guarda en `localStorage`.

## 📱 Uso de la App

### Crear un botón

1. Click en un espacio vacío (botón con +)
2. Configura:
   - Etiqueta
   - Icono (FontAwesome, PrimeIcons, o SVG custom)
   - Tipo de acción (Comando, URL, App instalada)
   - Comando/URL a ejecutar

### Ejecutar un botón

- **Click**: Ejecuta el comando
- **Click derecho**: Editar el botón
- **Arrastrar**: Reorganizar posición

### Comandos multimedia

- Click en el botón 🎵
- Selecciona comandos predefinidos (Play, Pause, Volumen, etc.)

### Tema

- Click en el botón 🌙/☀️ para cambiar entre tema oscuro y claro

## 🔐 Seguridad

⚠️ **IMPORTANTE**: Esta app está diseñada para uso personal en una red local confiable. No expongas el servidor a internet sin implementar medidas de seguridad adicionales:

- Autenticación
- HTTPS
- Rate limiting
- Firewall rules

## 📝 Comandos Disponibles

### Raíz del proyecto

```bash
pnpm install          # Instalar todas las dependencias
pnpm run dev          # Desarrollo (backend + frontend)
pnpm run build        # Build de producción
```

### Backend

```bash
cd apps/server
pnpm run start:dev         # Desarrollo con hot reload
pnpm run build             # Compilar TypeScript
pnpm run build:standalone  # Generar ejecutable standalone
.\build-portable.ps1       # Crear carpeta portable
```

### Frontend

```bash
cd apps/web
pnpm run dev     # Desarrollo
pnpm run build   # Build PWA de producción
pnpm run preview # Preview del build
```

## 🐛 Solución de Problemas

### No se conecta desde otro dispositivo

1. Verifica que ambos dispositivos estén en la misma red
2. Verifica que el firewall de Windows permita conexiones en el puerto 3000
3. Asegúrate de usar la IP correcta (la que muestra el servidor en consola)

### El PWA no se actualiza

1. Desinstala la app PWA
2. Limpia el caché del navegador
3. Vuelve a instalar

### Los comandos no se ejecutan

1. Verifica que el backend esté corriendo
2. Verifica la configuración de la IP en el frontend
3. Revisa los logs del servidor

## 📄 Licencia

© 2026 Manuel Henriquez - Todos los derechos reservados

Para uso personal únicamente.

## 👨‍💻 Autor

**Manuel Henriquez**

- 🌐 [https://mhenriquezdev.com/](https://mhenriquezdev.com/)

---

Hecho con ❤️ para controlar mi PC desde cualquier lugar de la casa
