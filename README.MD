# Stream Deck Local - Web + Backend

¡Bienvenido! Este proyecto te permite usar tu computadora como un **Stream Deck local** mediante una interfaz web y un backend que corre en tu PC.

## 🔹 Funcionalidad

- Frontend web con botones interactivos
- Backend local que ejecuta acciones en tu PC (abrir apps, simular teclas, etc.)
- Comunicación via WebSocket
- Interfaz accesible desde cualquier navegador en la misma red

---

## 📦 Requisitos

- Navegador moderno (Chrome, Edge, Firefox)
- Backend local (descargable desde nuestra web o repo)
  - Windows, Mac o Linux
  - No requiere Node.js si descargas el ejecutable
- Conexión entre web y backend local (localhost)

---

## ⚡ Cómo usarlo

1. Abre la web: [tu-página-web.com](#)
2. Verifica si tu backend local está corriendo:
   - Si no, descarga el backend desde [aquí](#)
   - Haz doble clic en el ejecutable (`server.exe` en Windows, `.app` en Mac, binario en Linux)
3. Una vez que el backend esté corriendo, la web detectará automáticamente la conexión
4. Usa los botones para ejecutar acciones locales en tu PC

---

## 🛠 Notas importantes

- El frontend puede funcionar solo, pero **las acciones locales solo funcionan con el backend corriendo**
- Mantén el backend actualizado para nuevas funciones
- No necesitas abrir ninguna terminal ni instalar Node.js si usas los ejecutables proporcionados

---

## 📂 Archivos

- `/web/dist` → Archivos compilados del frontend
- `/server` → Backend local
- `/packages/shared` → Librería compartida (no necesario para usuarios finales)

---

## ⚙️ Soporte

Si algo no funciona:

- Verifica que el backend local esté corriendo en `localhost:3000`
- Revisa tu firewall si bloquea conexiones locales
- Contacto: [hola@mhenriquezdev.com](mailto:hola@mhenriquezdev.com), [mdhenriquez16@gmail.com](mailto:mdhenriquez16@gmail.com)
- WhatsApp:
  - [Consulta sobre el proyecto](https://wa.me/50492370288?text=Hola%20Manuel,%20tengo%20una%20consulta%20sobre%20el%20proyecto%20Stream%20Deck)
  - [Colaboración](https://wa.me/50492370288?text=Hola%20Manuel,%20me%20gustaría%20colaborar%20en%20tu%20proyecto%20Stream%20Deck)
  - [Otro mensaje](https://wa.me/50492370288)
