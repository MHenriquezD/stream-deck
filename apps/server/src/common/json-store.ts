import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Almacenamiento JSON en disco, asíncrono y seguro frente a concurrencia.
 *
 * - **No bloquea el event loop**: usa fs.promises en lugar de las variantes
 *   síncronas que se ejecutaban en cada request.
 * - **Escrituras atómicas**: escribe a un fichero temporal y hace rename, de
 *   modo que un fallo a mitad de escritura nunca deja un JSON corrupto.
 * - **Serializado por fichero**: todas las escrituras a una misma ruta pasan
 *   por una cola, así dos servicios (o dos peticiones) que tocan el mismo
 *   fichero no se pisan (read-modify-write sin perder actualizaciones).
 */
export class JsonStore {
  private static readonly logger = new Logger(JsonStore.name);
  /** Una cola de escritura por ruta absoluta, compartida entre instancias. */
  private static readonly queues = new Map<string, Promise<unknown>>();

  /** Lee y parsea un JSON; devuelve `fallback` si no existe o está corrupto. */
  static async read<T>(filePath: string, fallback: T): Promise<T> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code && code !== 'ENOENT') {
        JsonStore.logger.warn(`No se pudo leer ${filePath}: ${String(err)}`);
      }
      return fallback;
    }
  }

  /** Sobrescribe un fichero de forma atómica y serializada. */
  static write<T>(filePath: string, data: T): Promise<void> {
    return JsonStore.enqueue(filePath, () =>
      JsonStore.atomicWrite(filePath, data),
    );
  }

  /**
   * Read-modify-write atómico bajo el lock del fichero: nadie más escribe
   * entre la lectura y la escritura. `mutator` recibe el valor actual (o
   * `fallback`) y devuelve el nuevo valor a persistir, que también se retorna.
   */
  static update<T>(
    filePath: string,
    fallback: T,
    mutator: (current: T) => T,
  ): Promise<T> {
    return JsonStore.enqueue(filePath, async () => {
      const current = await JsonStore.read(filePath, fallback);
      const next = mutator(current);
      await JsonStore.atomicWrite(filePath, next);
      return next;
    });
  }

  /** Encadena `task` a la cola de la ruta para serializar el acceso. */
  private static enqueue<T>(
    filePath: string,
    task: () => Promise<T>,
  ): Promise<T> {
    const previous = JsonStore.queues.get(filePath) ?? Promise.resolve();
    // El siguiente task espera al anterior, pero sin heredar su posible error.
    const run = previous.then(task, task);
    // Mantener la cola viva aunque un task falle (swallow para la cadena).
    JsonStore.queues.set(
      filePath,
      run.then(
        () => undefined,
        () => undefined,
      ),
    );
    return run;
  }

  private static async atomicWrite<T>(
    filePath: string,
    data: T,
  ): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const contents = JSON.stringify(data, null, 2);
    try {
      await fs.writeFile(tmp, contents, 'utf-8');
      await fs.rename(tmp, filePath);
    } catch (err) {
      // Limpiar el temporal si el rename falló.
      await fs.rm(tmp, { force: true }).catch(() => undefined);
      throw err;
    }
  }
}
