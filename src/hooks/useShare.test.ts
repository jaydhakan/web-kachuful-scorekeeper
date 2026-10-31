import { shareScores } from './useShare';

const blob = new Blob(['x'], { type: 'image/png' });

afterEach(() => {
  for (const k of ['canShare', 'share', 'clipboard']) Reflect.deleteProperty(navigator, k);
  vi.restoreAllMocks();
});

const define = (k: string, v: unknown) =>
  Object.defineProperty(navigator, k, { value: v, configurable: true });

describe('shareScores', () => {
  it('shares the PNG through the system sheet when files are supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    define('canShare', () => true);
    define('share', share);
    expect(await shareScores(blob, 'summary')).toBe('shared');
    const arg = share.mock.calls[0][0];
    expect(arg.files[0]).toMatchObject({ name: 'kachuful-scores.png', type: 'image/png' });
    expect(arg.text).toBe('summary');
  });

  it('reports a dismissed share sheet as cancelled, not an error', async () => {
    define('canShare', () => true);
    define('share', vi.fn().mockRejectedValue(new DOMException('no', 'AbortError')));
    expect(await shareScores(blob, 's')).toBe('cancelled');
  });

  it('downloads the image and copies the summary when files cannot be shared', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    define('clipboard', { writeText });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    expect(await shareScores(blob, 'the text')).toBe('saved');
    expect(click).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith('the text');
  });

  it('still saves when the clipboard is blocked', async () => {
    define('clipboard', { writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    expect(await shareScores(blob, 't')).toBe('saved');
  });

  it('reports other failures', async () => {
    define('canShare', () => true);
    define('share', vi.fn().mockRejectedValue(new Error('boom')));
    expect(await shareScores(blob, 't')).toBe('failed');
  });
});
