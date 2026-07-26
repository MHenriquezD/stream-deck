import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JsonStore } from './json-store';

describe('JsonStore', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsonstore-'));
    file = path.join(dir, 'data.json');
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('returns the fallback when the file does not exist', async () => {
    const value = await JsonStore.read(file, { count: 0 });
    expect(value).toEqual({ count: 0 });
  });

  it('writes and reads back a value', async () => {
    await JsonStore.write(file, { hello: 'world' });
    expect(await JsonStore.read(file, null)).toEqual({ hello: 'world' });
  });

  it('creates missing parent directories', async () => {
    const nested = path.join(dir, 'a', 'b', 'c.json');
    await JsonStore.write(nested, { ok: true });
    expect(await JsonStore.read(nested, null)).toEqual({ ok: true });
  });

  it('returns the fallback on corrupted JSON (does not throw)', async () => {
    await fs.writeFile(file, '{ not valid json', 'utf-8');
    expect(await JsonStore.read(file, { safe: true })).toEqual({ safe: true });
  });

  it('does not leave a temp file behind after writing', async () => {
    await JsonStore.write(file, { a: 1 });
    const entries = await fs.readdir(dir);
    expect(entries).toEqual(['data.json']);
  });

  it('serializes concurrent updates without losing increments', async () => {
    // 50 concurrent read-modify-write increments. Without the per-file queue
    // these would race and lose updates; with it the final count must be 50.
    await JsonStore.write(file, { count: 0 });
    await Promise.all(
      Array.from({ length: 50 }, () =>
        JsonStore.update<{ count: number }>(file, { count: 0 }, (c) => ({
          count: c.count + 1,
        })),
      ),
    );
    expect(await JsonStore.read(file, { count: -1 })).toEqual({ count: 50 });
  });

  it('keeps the queue alive after a failing task', async () => {
    // A write to an impossible path fails, but later writes must still work.
    const bad = path.join(dir, '\0invalid', 'x.json');
    await expect(JsonStore.write(bad, { a: 1 })).rejects.toBeDefined();
    await JsonStore.write(file, { recovered: true });
    expect(await JsonStore.read(file, null)).toEqual({ recovered: true });
  });
});
