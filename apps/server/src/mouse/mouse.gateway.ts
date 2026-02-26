import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MouseService } from './mouse.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class MouseGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly mouseService: MouseService) {}

  // ─── Mouse Move (relative delta) ───
  @SubscribeMessage('mouse:move')
  handleMove(@MessageBody() data: { dx: number; dy: number }) {
    this.mouseService.move(data.dx, data.dy);
    // No return — fire and forget for speed
  }

  // ─── Left Click ───
  @SubscribeMessage('mouse:click')
  async handleClick() {
    await this.mouseService.clickLeft();
    return { success: true };
  }

  // ─── Right Click ───
  @SubscribeMessage('mouse:rightClick')
  async handleRightClick() {
    await this.mouseService.clickRight();
    return { success: true };
  }

  // ─── Double Click ───
  @SubscribeMessage('mouse:doubleClick')
  async handleDoubleClick() {
    await this.mouseService.doubleClick();
    return { success: true };
  }

  // ─── Scroll ───
  @SubscribeMessage('mouse:scroll')
  handleScroll(
    @MessageBody()
    data: {
      amountY?: number;
      amountX?: number;
      amount?: number;
    },
  ) {
    // Vertical scroll (support both old 'amount' and new 'amountY')
    const vertical = data.amountY ?? data.amount ?? 0;
    if (vertical !== 0) {
      this.mouseService.scroll(vertical);
    }
    // Horizontal scroll
    const horizontal = data.amountX ?? 0;
    if (horizontal !== 0) {
      this.mouseService.scrollHorizontal(horizontal);
    }
  }

  // ─── Drag (press and hold) ───
  @SubscribeMessage('mouse:pressDown')
  async handlePressDown() {
    await this.mouseService.pressDown();
    return { success: true };
  }

  @SubscribeMessage('mouse:pressUp')
  async handlePressUp() {
    await this.mouseService.pressUp();
    return { success: true };
  }

  // ─── Keyboard: type text ───
  @SubscribeMessage('keyboard:type')
  async handleType(@MessageBody() data: { text: string }) {
    await this.mouseService.typeText(data.text);
    return { success: true };
  }

  // ─── Keyboard: press key ───
  @SubscribeMessage('keyboard:key')
  async handleKey(@MessageBody() data: { key: string }) {
    await this.mouseService.pressKey(data.key);
    return { success: true };
  }

  // ─── Keyboard: key combination ───
  @SubscribeMessage('keyboard:combo')
  async handleCombo(@MessageBody() data: { keys: string[] }) {
    await this.mouseService.pressKeyCombination(data.keys);
    return { success: true };
  }

  // ─── Check availability ───
  @SubscribeMessage('mouse:status')
  handleStatus() {
    return { available: this.mouseService.isAvailable() };
  }
}
