import { contrastRatio } from '../src/lib/a11y';
import { Theme, darkTheme, lightTheme } from '../src/theme';

describe('contrast helper', () => {
  it('black on white = 21:1, same colour = 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

describe.each([['light', lightTheme], ['dark', darkTheme]] as [string, Theme][])('%s theme meets WCAG AA', (_n, th) => {
  it.each([
    ['text on bg', th.text, th.bg],
    ['text on surface', th.text, th.surface],
    ['muted on bg', th.muted, th.bg],
    ['muted on surface', th.muted, th.surface],
    ['primary on surface', th.primary, th.surface],
    ['primary on bg', th.primary, th.bg],
    ['onPrimary on primary', th.onPrimary, th.primary],
    ['onDanger on danger', th.onDanger, th.danger],
    ['error text on surface', th.errorText, th.surface],
    ['error text on bg', th.errorText, th.bg],
  ])('%s >= 4.5:1', (_label, fg, bg) => expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5));

  it('input/card borders >= 3:1 against surface (non-text contrast)', () =>
    expect(contrastRatio(th.border, th.surface)).toBeGreaterThanOrEqual(3));
});
