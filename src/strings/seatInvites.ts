/** Seat invites, on every game that has them (Spades, Ishaara). On screen they are simply "invites". */
export const seatInvites = {
  /** The banner and the card's heading. */
  invitedYou: (host: string) => `${host} invited you`,
  invitedYouTo: (host: string, game: string) => `${host} invited you to ${game}`,
  partner: (name: string) => `you’d partner ${name}`,
  join: 'Join',
  joining: 'Joining…',
  later: 'Later',
  decline: 'Decline',
  declining: 'Declining…',
  listTitle: 'Invites',
  filled: 'This table has filled up',
  failed: 'Couldn’t reach the server. Try again.',
  declined: (host: string) => `Invite declined. ${host} will see that.`,
  bannerLabel: 'Invite',
  seatMap: (taken: number, yours: boolean) =>
    `${taken} of 4 seats taken${yours ? ', yours is free' : ''}`,

  /** The host's picker (TableInviteSheet). */
  sheet: {
    title: 'Invite to this seat',
    subtitle: 'The invite reaches their phone straight away.',
    search: 'Search your circle',
    online: 'Online now',
    circle: 'Your circle',
    invite: 'Invite',
    inviting: 'Inviting…',
    onlineAria: 'online now',
    played: (ago: string) => `played ${ago}`,
    neverPlayed: 'in your circle',
    loading: 'Looking up your circle',
    loadFailed: 'Couldn’t load your circle.',
    retry: 'Try again',
    empty:
      'Nobody to invite yet. People join your circle when you play with them, once they have an account.',
    noResults: (q: string) =>
      `No one called “${q}” in your circle. People join it when you play with them.`,
    sendFailed: 'Couldn’t send the invite. Try again.',
  },
};
