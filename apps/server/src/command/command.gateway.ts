import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { CommandService } from './command.service';
import { StreamCommand } from './interfaces/command.interface';
import { SettingsService } from './settings.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class CommandGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly commandService: CommandService,
    private readonly settingsService: SettingsService,
    private readonly authService: AuthService,
  ) {}

  handleConnection(client: Socket) {
    // If no PIN configured, allow all connections
    if (!this.authService.isPinConfigured()) {
      console.log(`🔌 Cliente conectado (sin PIN): ${client.id}`);
      return;
    }

    const token =
      (client.handshake.auth as any)?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token || !this.authService.validateToken(token)) {
      console.log(`🚫 Cliente rechazado (sin auth): ${client.id}`);
      client.emit('auth:error', { message: 'Token inválido' });
      client.disconnect(true);
      return;
    }

    console.log(`🔌 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Cliente desconectado: ${client.id}`);
  }

  // ─── Ejecutar comando ───
  @SubscribeMessage('execute')
  async handleExecute(@MessageBody() data: { id: string }) {
    try {
      const result = await this.commandService.execute(data.id);
      return {
        event: 'execute:result',
        data: { success: true, output: result?.output },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      return {
        event: 'execute:result',
        data: { success: false, message },
      };
    }
  }

  // ─── Obtener comandos ───
  @SubscribeMessage('commands:get')
  async handleGetCommands() {
    const commands = await this.commandService.getAll();
    return { event: 'commands:list', data: commands };
  }

  // ─── Guardar comandos (y notificar a todos los clientes) ───
  @SubscribeMessage('commands:save')
  async handleSaveCommands(@MessageBody() commands: StreamCommand[]) {
    await this.commandService.saveAll(commands);
    // Notificar a TODOS los clientes conectados
    this.server.emit('commands:updated', commands);
    return { event: 'commands:saved', data: { success: true } };
  }

  // ─── Obtener settings ───
  @SubscribeMessage('settings:get')
  handleGetSettings() {
    const settings = this.settingsService.getAll();
    return { event: 'settings:data', data: settings };
  }

  // ─── Actualizar gridSize (y notificar a todos) ───
  @SubscribeMessage('settings:gridSize')
  handleSetGridSize(@MessageBody() data: { gridSize: number }) {
    this.settingsService.setGridSize(data.gridSize);
    // Notificar a TODOS los clientes conectados
    this.server.emit('settings:gridSizeChanged', { gridSize: data.gridSize });
    return { event: 'settings:gridSizeUpdated', data: { success: true } };
  }
}
