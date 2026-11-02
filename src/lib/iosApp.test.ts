import { fitIosApp, iosAppHeight } from './iosApp';

// An iPhone 16 Pro: 402×874 points. iOS reports screen.width and screen.height the same way up whatever the rotation.
const pro = { screenW: 402, screenH: 874 };

describe('iosAppHeight', () => {
  it("is the screen's height upright, whatever iOS says the viewport is", () => {
    expect(iosAppHeight({ ...pro, innerW: 402, portrait: true })).toBe(874);
  });

  it("is the screen's short side on its side", () => {
    expect(iosAppHeight({ ...pro, innerW: 874, portrait: false })).toBe(402);
  });

  it('is 0 when the app has only part of the screen (iPad split view)', () => {
    expect(iosAppHeight({ screenW: 1024, screenH: 1366, innerW: 678, portrait: false })).toBe(0);
  });
});

describe('fitIosApp', () => {
  const root = document.documentElement;
  afterEach(() => {
    root.removeAttribute('data-ios-app');
    root.style.removeProperty('--app-h');
    delete (navigator as { standalone?: boolean }).standalone;
  });

  it('leaves a browser tab alone', () => {
    fitIosApp();
    expect(root).not.toHaveAttribute('data-ios-app');
    expect(root.style.getPropertyValue('--app-h')).toBe('');
  });

  it('marks a Home Screen app on iOS', () => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    fitIosApp();
    expect(root).toHaveAttribute('data-ios-app');
  });
});
