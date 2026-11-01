/** The only password rule: 3 to 128 characters and no whitespace anywhere (the backend's HANDOFF.md §5.3). */
export const passwordOk = (pw: string): boolean =>
  pw.length >= 3 && pw.length <= 128 && !/\s/.test(pw);
