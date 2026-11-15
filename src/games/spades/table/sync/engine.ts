// Placeholder owned by the table-mode agent, who replaces both bodies with the real upload engine (plan §7.1).

/** Uploads this device's table-mode games now. */
export const syncSpNow = async (): Promise<void> => {};

/** This account's table-mode games the server hasn't accepted yet. */
export const pendingSpGames: (userId: string) => readonly unknown[] = () => [];
