/**
 * Command validation for the stream deck.
 *
 * Security model: commands are configured locally by an authenticated user, but
 * a compromised or malicious payload must not be able to inject *additional*
 * shell commands, and only a known set of launcher/media executables may be run
 * as raw shell. This replaces the old substring denylist (trivially bypassable)
 * with a positive allowlist plus structural injection checks.
 */

export type Platform = NodeJS.Platform;

export type CommandKind = 'url' | 'path' | 'shell';

export interface ValidationResult {
  allowed: boolean;
  kind?: CommandKind;
  reason?: string;
}

/** Characters that allow chaining/redirecting additional shell commands. */
const SHELL_METACHARACTERS = /[&|;`$><\n\r]/;

/** Control characters (newlines, nulls, escapes, etc.) are never allowed. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/;

/** Inner quotes that could break out of an interpolated shell argument. */
const QUOTES = /["']/;

/**
 * First-token executables permitted for raw shell commands, per platform.
 * These are launchers and media/volume helpers — never destructive tools.
 */
const SHELL_ALLOWLIST: Record<string, string[]> = {
  win32: ['start', 'explorer', 'explorer.exe', 'powershell', 'cmd'],
  darwin: ['open', 'osascript'],
  linux: [
    'xdg-open',
    'gtk-launch',
    'nohup',
    'pactl',
    'playerctl',
    'brightnessctl',
    'amixer',
  ],
};

/** Destructive patterns rejected on every path, as a defense-in-depth layer. */
const DESTRUCTIVE: Record<string, string[]> = {
  common: ['shutdown', 'reboot'],
  win32: [
    'del ',
    'format ',
    'powershell -enc',
    'reg delete',
    'diskpart',
    'rmdir',
  ],
  darwin: [
    'rm -rf /',
    'diskutil erasedisk',
    'diskutil partitiondisk',
    'sudo rm',
    'sudo reboot',
    'sudo halt',
    'srm ',
    'newfs_',
  ],
  linux: [
    'rm -rf /',
    'dd if=',
    'mkfs.',
    'sudo rm',
    'sudo reboot',
    'sudo halt',
    ':(){',
    'chmod -r 777 /',
    'mv / ',
    '> /dev/sda',
  ],
};

const URL_PATTERN = /^(https?:\/\/|www\.)/i;

/** True when the payload looks like a filesystem path / app-launch target. */
function looksLikePath(payload: string, platform: Platform): boolean {
  const t = payload.trim().replace(/^["']|["']$/g, '');
  if (platform === 'win32') {
    return (
      /^[a-z]:\\/i.test(t) || // drive path
      t.toLowerCase().startsWith('shell:appsfolder\\') ||
      t.toLowerCase().includes('\\windowsapps\\')
    );
  }
  if (platform === 'darwin') {
    return t.startsWith('/') || t.endsWith('.app') || t.includes('.app/');
  }
  // linux
  return t.startsWith('/') || t.endsWith('.desktop');
}

function containsDestructive(lower: string, platform: Platform): boolean {
  const patterns = [...DESTRUCTIVE.common, ...(DESTRUCTIVE[platform] ?? [])];
  return patterns.some((p) => lower.includes(p));
}

/** Extract the leading executable token (strips quotes), lowercased. */
function firstToken(payload: string): string {
  const trimmed = payload.trim();
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1);
    if (end > 0) return trimmed.slice(1, end).toLowerCase();
  }
  return trimmed.split(/\s+/)[0].toLowerCase();
}

/**
 * Validate a command payload.
 *
 * @param payload The raw payload as stored in the command.
 * @param platform The OS platform.
 * @param trustedPayloads Server-generated preset payloads that are trusted
 *   verbatim (they contain shell syntax by design).
 */
export function validateCommand(
  payload: string,
  platform: Platform,
  trustedPayloads: ReadonlySet<string> = new Set(),
): ValidationResult {
  if (!payload || typeof payload !== 'string') {
    return { allowed: false, reason: 'Comando vacío' };
  }

  const trimmed = payload.trim();
  if (trimmed.length === 0) {
    return { allowed: false, reason: 'Comando vacío' };
  }

  // Control characters are never acceptable.
  if (CONTROL_CHARACTERS.test(trimmed)) {
    return {
      allowed: false,
      reason: 'El comando contiene caracteres no válidos',
    };
  }

  const lower = trimmed.toLowerCase();

  // Destructive patterns are rejected regardless of category.
  if (containsDestructive(lower, platform)) {
    return {
      allowed: false,
      reason: 'Comando potencialmente destructivo bloqueado',
    };
  }

  // 1) Server-defined presets are trusted verbatim.
  if (trustedPayloads.has(payload) || trustedPayloads.has(trimmed)) {
    return { allowed: true, kind: 'shell' };
  }

  // 2) URLs — must be a clean http(s)/www target with no shell metacharacters.
  if (URL_PATTERN.test(trimmed)) {
    if (SHELL_METACHARACTERS.test(trimmed) || QUOTES.test(trimmed)) {
      return {
        allowed: false,
        reason: 'La URL contiene caracteres no permitidos',
      };
    }
    return { allowed: true, kind: 'url' };
  }

  // 3) Filesystem / app-launch paths — reject anything that could chain a
  //    second command once interpolated into a shell string.
  if (looksLikePath(trimmed, platform)) {
    const unquoted = trimmed.replace(/^["']|["']$/g, '');
    if (SHELL_METACHARACTERS.test(unquoted) || QUOTES.test(unquoted)) {
      return {
        allowed: false,
        reason: 'La ruta contiene caracteres no permitidos',
      };
    }
    return { allowed: true, kind: 'path' };
  }

  // 4) Raw shell — only an allowlisted launcher/media executable, and no
  //    command chaining.
  const allowlist = SHELL_ALLOWLIST[platform] ?? [];
  const exe = firstToken(trimmed);
  if (!allowlist.includes(exe)) {
    return {
      allowed: false,
      reason: `Ejecutable no permitido: "${exe}". Usa una ruta de app, una URL o un preset.`,
    };
  }
  if (SHELL_METACHARACTERS.test(trimmed)) {
    return {
      allowed: false,
      reason: 'No se permite encadenar comandos (&, |, ;, $(), etc.)',
    };
  }

  return { allowed: true, kind: 'shell' };
}
