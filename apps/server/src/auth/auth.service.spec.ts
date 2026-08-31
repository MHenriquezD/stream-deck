import { JsonStore } from '../common/json-store';
import { AuthService } from './auth.service';

// Keep the service fully in-memory: no real disk access.
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(() => '{}'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Persistence goes through JsonStore (tested separately); stub it out so the
// auth tests never touch disk.
jest.spyOn(JsonStore, 'write').mockResolvedValue(undefined);
jest
  .spyOn(JsonStore, 'update')
  .mockImplementation((_p, fallback) => Promise.resolve(fallback));

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe('AuthService — session expiry', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    service = new AuthService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('issues a valid token on setPin', () => {
    const { token } = service.setPin('1234');
    expect(service.validateToken(token)).toBe(true);
  });

  it('rejects a token after the TTL elapses', () => {
    const { token } = service.setPin('1234');
    expect(service.validateToken(token)).toBe(true);

    jest.advanceTimersByTime(SEVEN_DAYS_MS - 1000);
    expect(service.validateToken(token)).toBe(true);

    jest.advanceTimersByTime(2000); // now past the TTL
    expect(service.validateToken(token)).toBe(false);
  });

  it('drops an expired token so it cannot be reused', () => {
    const { token } = service.setPin('1234');
    jest.advanceTimersByTime(SEVEN_DAYS_MS + 1);
    expect(service.validateToken(token)).toBe(false);
    // Still invalid on a second check.
    expect(service.validateToken(token)).toBe(false);
  });

  it('invalidates a token on logout', () => {
    const { token } = service.setPin('1234');
    service.logout(token);
    expect(service.validateToken(token)).toBe(false);
  });

  it('rejects unknown tokens', () => {
    service.setPin('1234');
    expect(service.validateToken('not-a-real-token')).toBe(false);
  });

  it('persists sessions in the { token: expiresAt } format', () => {
    const { token } = service.setPin('1234');
    const writeMock = jest.mocked(JsonStore.write);
    const sessionWrite = writeMock.mock.calls
      .slice()
      .reverse()
      .find(([p]) => String(p).includes('sessions.json'));
    expect(sessionWrite).toBeDefined();
    const payload = sessionWrite![1] as Record<string, number>;
    expect(Array.isArray(payload)).toBe(false);
    expect(typeof payload[token]).toBe('number');
  });
});
