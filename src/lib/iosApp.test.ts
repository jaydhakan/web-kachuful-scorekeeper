import { fitIosApp, iosGap } from './iosApp';

// An iPhone 16 Pro: 402×874 points, a 62pt status bar.
const pro = { screenW: 402, screenH: 874, innerW: 402, top: 62 };

describe('iosGap', () => {
  it("is the status bar's height when the viewport leaves it out but still starts at the top", () => {
    expect(iosGap({ ...pro, innerH: 812 })).toBe(62);
  });

  it('is 0 when the viewport fills the screen (an iOS without the bug)', () => {
    expect(iosGap({ ...pro, innerH: 874 })).toBe(0);
  });

  it('is 0 on its side, where there is no status bar', () => {
    expect(iosGap({ screenW: 402, screenH: 874, innerW: 874, innerH: 380, top: 0 })).toBe(0);
  });

  it('is 0 for any other shortfall, such as a browser toolbar', () => {
    expect(iosGap({ ...pro, innerH: 760 })).toBe(0);
  });
});

describe('fitIosApp', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-ios-app');
    delete (navigator as { standalone?: boolean }).standalone;
  });

  it('marks only a Home Screen app on iOS', () => {
    fitIosApp();
    expect(document.documentElement).not.toHaveAttribute('data-ios-app');
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    fitIosApp();
    expect(document.documentElement).toHaveAttribute('data-ios-app');
    // jsdom has no safe area, so there is nothing to make up for.
    expect(document.documentElement.style.getPropertyValue('--ios-gap')).toBe('');
  });
});
