import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { CommandService } from './command.service';
import { StreamCommand } from './interfaces/command.interface';
import { SettingsService } from './settings.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class CommandGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  /** Cada cuánto se revalidan los tokens de los sockets ya conectados. */
  private static readonly REVALIDATE_INTERVAL_MS = 60_000; // 60s
  private revalidateTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly commandService: CommandService,
    private readonly settingsService: SettingsService,
    private readonly authService: AuthService,
  ) {}

  afterInit() {
    // El token se valida al conectar, pero un socket puede quedarse abierto
    // más allá de la expiración del token. Este barrido cierra esas sesiones.
    this.revalidateTimer = setInterval(
      () => this.revalidateClients(),
      CommandGateway.REVALIDATE_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    if (this.revalidateTimer) clearInterval(this.revalidateTimer);
  }

  handleConnection(client: Socket) {
    // If no PIN configured, allow all connections
    if (!this.authService.isPinConfigured()) {
      console.log(`🔌 Cliente conectado (sin PIN): ${client.id}`);
      return;
    }

    const token = this.extractToken(client);

    if (!token || !this.authService.validateToken(token)) {
      console.log(`🚫 Cliente rechazado (sin auth): ${client.id}`);
      client.emit('auth:error', { message: 'Token inválido' });
      client.disconnect(true);
      return;
    }

    // Guardar el token para poder revalidarlo periódicamente.
    client.data.token = token;
    console.log(`🔌 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Cliente desconectado: ${client.id}`);
  }

  private extractToken(client: Socket): string | undefined {
    return (
      (client.handshake.auth as { token?: string })?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '')
    );
  }

  /**
   * Recorre los sockets conectados y desconecta los que ya no tienen un token
   * válido (expirado, o invalidado al cambiar el PIN). Sin PIN configurado no
   * hay nada que revalidar.
   */
  revalidateClients() {
    if (!this.authService.isPinConfigured()) return;

    const sockets = this.server?.sockets?.sockets;
    if (!sockets) return;

    for (const client of sockets.values()) {
      const token = (client.data as { token?: string })?.token;
      if (!token || !this.authService.validateToken(token)) {
        console.log(`⏳ Sesión expirada, desconectando: ${client.id}`);
        client.emit('auth:error', { message: 'Sesión expirada' });
        client.disconnect(true);
      }
    }
  }

  // ─── Ejecutar comando ───
  @SubscribeMessage('execute')
  async handleExecute(@MessageBody() data: { id: string }) {
    try {
      const result = await this.commandService.execute(data.id);
      return { success: true, output: result?.output };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      return { success: false, message };
    }
  }

  // ─── Obtener comandos ───
  @SubscribeMessage('commands:get')
  async handleGetCommands() {
    const commands = await this.commandService.getAll();
    return commands;
  }

  // ─── Guardar comandos (y notificar a todos los clientes) ───
  @SubscribeMessage('commands:save')
  async handleSaveCommands(@MessageBody() commands: StreamCommand[]) {
    await this.commandService.saveAll(commands);
    // Notificar a TODOS los clientes conectados
    this.server.emit('commands:updated', commands);
    return { success: true };
  }

  // ─── Obtener settings ───
  @SubscribeMessage('settings:get')
  async handleGetSettings() {
    return await this.settingsService.getAll();
  }

  // ─── Actualizar gridSize (y notificar a todos) ───
  @SubscribeMessage('settings:gridSize')
  async handleSetGridSize(@MessageBody() data: { gridSize: number }) {
    await this.settingsService.setGridSize(data.gridSize);
    // Notificar a TODOS los clientes conectados
    this.server.emit('settings:gridSizeChanged', { gridSize: data.gridSize });
    return { success: true };
  }

  // ─── Actualizar sonido (y notificar a todos) ───
  @SubscribeMessage('settings:buttonSound')
  async handleSetButtonSound(
    @MessageBody() data: { enabled: boolean; file: string },
  ) {
    if (typeof data.enabled === 'boolean') {
      await this.settingsService.setButtonSound(data.enabled);
    }
    if (data.file) {
      await this.settingsService.setButtonSoundFile(data.file);
    }
    // Notificar a TODOS los clientes conectados
    this.server.emit('settings:buttonSoundChanged', {
      enabled: await this.settingsService.getButtonSound(),
      file: await this.settingsService.getButtonSoundFile(),
    });
    return { success: true };
  }

  // ─── Volume Control (real-time) ───
  @SubscribeMessage('volume:get')
  async handleGetVolume() {
    try {
      return await this.commandService.getVolume();
    } catch {
      return { volume: 0, muted: false };
    }
  }

  @SubscribeMessage('volume:set')
  async handleSetVolume(@MessageBody() data: { volume: number }) {
    try {
      await this.commandService.setVolume(data.volume);
      const state = await this.commandService.getVolume();
      // Broadcast to all clients
      this.server.emit('volume:changed', state);
      return { success: true, ...state };
    } catch {
      return { success: false };
    }
  }

  @SubscribeMessage('volume:mute')
  async handleToggleMute() {
    try {
      const muted = await this.commandService.toggleMute();
      const state = await this.commandService.getVolume();
      this.server.emit('volume:changed', state);
      return { success: true, ...state };
    } catch {
      return { success: false };
    }
  }

  // ─── Activar/Desactivar servidor (desktop toggle, notifica a todos) ───
  @SubscribeMessage('server:setEnabled')
  async handleSetServerEnabled(@MessageBody() data: { enabled: boolean }) {
    await this.settingsService.setServerEnabled(data.enabled);
    // Notificar a TODOS los clientes conectados
    this.server.emit('server:enabledChanged', { enabled: data.enabled });
    return { success: true };
  }
}
