import { CommandGateway } from './command.gateway';

/** Socket falso mínimo para el barrido de revalidación. */
function fakeSocket(id: string, token?: string) {
  return {
    id,
    data: { token },
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
}

function makeGateway(opts: {
  pinConfigured: boolean;
  validTokens: string[];
  sockets: ReturnType<typeof fakeSocket>[];
}) {
  const authService = {
    isPinConfigured: () => opts.pinConfigured,
    validateToken: (t: string) => opts.validTokens.includes(t),
  };
  const gateway = new CommandGateway(
    {} as never,
    {} as never,
    authService as never,
  );
  const map = new Map(opts.sockets.map((s) => [s.id, s]));
  gateway.server = { sockets: { sockets: map } } as never;
  return gateway;
}

describe('CommandGateway — revalidateClients', () => {
  it('disconnects sockets whose token is no longer valid', () => {
    const good = fakeSocket('good', 'valid-token');
    const expired = fakeSocket('expired', 'old-token');
    const gateway = makeGateway({
      pinConfigured: true,
      validTokens: ['valid-token'],
      sockets: [good, expired],
    });

    gateway.revalidateClients();

    expect(expired.disconnect).toHaveBeenCalledWith(true);
    expect(expired.emit).toHaveBeenCalledWith('auth:error', {
      message: 'Sesión expirada',
    });
    expect(good.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects sockets that have no token stored', () => {
    const anon = fakeSocket('anon', undefined);
    const gateway = makeGateway({
      pinConfigured: true,
      validTokens: ['valid-token'],
      sockets: [anon],
    });

    gateway.revalidateClients();

    expect(anon.disconnect).toHaveBeenCalledWith(true);
  });

  it('does nothing when no PIN is configured', () => {
    const anon = fakeSocket('anon', undefined);
    const gateway = makeGateway({
      pinConfigured: false,
      validTokens: [],
      sockets: [anon],
    });

    gateway.revalidateClients();

    expect(anon.disconnect).not.toHaveBeenCalled();
  });

  it('clears the interval on module destroy', () => {
    const gateway = makeGateway({
      pinConfigured: true,
      validTokens: [],
      sockets: [],
    });
    const clearSpy = jest.spyOn(global, 'clearInterval');
    gateway.afterInit();
    gateway.onModuleDestroy();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
