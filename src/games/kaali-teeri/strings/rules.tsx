import type { ReactNode } from 'react';

/** Numbers the Rules text reads; "150 / 350" when no game is open, so one text covers both deck counts. */
export interface RulesNums {
  side: 'left' | 'right';
  min: string;
  step: string;
  total: string;
}

/** The worked scoring example, worked out by the domain (KtRules of the game, or one deck). */
export interface Example {
  bid: number;
  total: number;
  madeDef: number;
  madeTeam: number;
  made: number;
  double: number;
  missDef: number;
  missed: number;
}

const Red = ({ children }: { children: ReactNode }) => (
  <span className="text-suit-red">{children}</span>
);

/** The rules page's sections, in the order a new table needs them. Tables go in where the page draws them. */
export const rulesText = {
  dealing: {
    title: 'Players and dealing',
    intro: (
      <>
        <b>4–6 players</b> play with one deck (<b>250</b> points), <b>7–10</b> with two (<b>500</b>
        ). Zero-point cards come out so everyone gets the same number of cards:
      </>
    ),
    order: (
      <>
        Cards come out in this order: 2♣ <Red>2♦ 2♥</Red> 2♠, then 3♣ <Red>3♦ 3♥</Red>, then 4s.
        With two decks both copies of a card go before the next.
      </>
    ),
    points: (
      <>
        <b>3♠ = 30</b> · A, K, Q, J, 10 = <b>10</b> each · every 5 = <b>5</b> · the rest 0.
      </>
    ),
    dealer: (n: RulesNums) => (
      <>
        The deal moves one seat to the <b>{n.side}</b> every hand.
      </>
    ),
  },
  bidding: {
    title: 'Bidding',
    turn: (n: RulesNums) => (
      <>
        The player on the dealer’s <b>{n.side}</b> speaks first. On your turn, bid more than the
        high bid (at least <b>{n.min}</b>, in steps of <b>{n.step}</b>, up to <b>{n.total}</b>) or{' '}
        <b>pass</b>.
      </>
    ),
    pass: (
      <>
        Passing isn’t final: you can <b>bid again</b> when your turn comes round. The auction ends
        when everyone else has passed in a row since the last bid.
      </>
    ),
    forced: (n: RulesNums) => (
      <>
        If nobody bids at all, the first speaker <b>must take it at {n.min}</b>. There are no
        redeals.
      </>
    ),
    quick: (
      <>
        <b>Quick mode</b> (the default): bid out loud at the table and record only who won and for
        how much. Switch it off to run the auction turn by turn in the app.
      </>
    ),
  },
  partners: {
    title: 'Trump and partners',
    trump: (
      <>
        The winning bidder names <b>trump</b> (any suit) and calls partners <b>by card</b>:
      </>
    ),
    secret: (
      <>
        Whoever plays a called card is on the bidder’s team, and nobody knows until it is played.
        The bidder may call a card they hold. Cards taken out can’t be called, nor can one card
        twice.
      </>
    ),
    copies: (
      <>
        With <b>two decks</b> each call says which copy counts: <b>1st played</b>, <b>2nd played</b>
        , or <b>the other one</b>: the bidder holds one copy and calls the other, so whoever plays
        it is a partner (never the bidder).
      </>
    ),
    lead: <>The bidder leads the first trick.</>,
  },
  tricks: {
    title: 'Playing a trick',
    body: (
      <>
        Follow the led suit if you can; if you can’t, play a trump or anything else. The highest
        trump wins, else the highest card of the led suit. With two decks, of two identical cards
        the one played <b>first</b> wins. The 3♠ is an ordinary spade here: only its 30 points are
        special. The winner leads next.
      </>
    ),
  },
  scoring: {
    title: 'Scoring',
    made: 'Made',
    missed: 'Missed',
    teamSweep: 'Team takes all',
    defSweep: 'Defenders take all',
    bidTimes: (bid: string) => `+${bid} × slots`,
    plus: (v: string) => `+${v}`,
    bid: 'bid',
    team: (
      <>
        The <b>team</b> is the bidder plus everyone who played a called card. Made means the team
        took at least the bid. Nobody ever loses points.
      </>
    ),
    slots: (
      <>
        <b>Slots:</b> 1 for the bidder plus 1 for each called card a player played. A partner who
        played two called cards scores the bid twice (<b>2×</b>); so does a bidder who played one of
        their own called cards. Taking everything (a <b>sweep</b>) scores the deck total instead,
        slots or not.
      </>
    ),
    entering: (
      <>
        At the end of the hand, count <b>either side’s</b> points (the defenders’ by default: a
        smaller pile) and the app works out the other.
      </>
    ),
    example: (e: Example) => (
      <>
        Bid <b>{e.bid}</b>, one partner. The defenders take {e.madeDef}, so the team has{' '}
        {e.madeTeam}: <b>made</b>. Bidder and partner <b className="text-[var(--pos)]">+{e.made}</b>{' '}
        each, defenders 0. Had the bidder played the called card themselves:{' '}
        <b className="text-[var(--pos)]">+{e.double}</b> (2×). Had the defenders taken {e.missDef}:{' '}
        <b>missed</b>, each defender <b className="text-[var(--pos)]">+{e.missed}</b>, the team 0.
      </>
    ),
  },
  length: {
    title: 'Game length',
    endless: (
      <>
        <b>Endless</b>: play as long as you like and finish from the menu.
      </>
    ),
    to1000: (
      <>
        <b>First to 1000</b>: the game ends after the hand in which someone reaches 1000. Highest
        total wins; ties share the place.
      </>
    ),
  },
};
