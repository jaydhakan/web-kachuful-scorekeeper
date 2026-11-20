/** Stat crowns (REWARDS-PLAN §6.2): this month's season awards, held live; a title under the holder's name. */
export const statCrowns = {
  /** By award code; the same code names the same crown in every game. */
  title: {
    season_sharpest: 'Nishanebaaz',
    season_iron: 'Lohe ka',
    season_climber: 'Charhta Sooraj',
    season_nil: 'Nil ka Nawab',
    season_pair: 'Jodi No. 1',
    season_kingmaker: 'Kingmaker',
    season_giver: 'Ishaaron ka Ustaad',
  } as Record<string, string>,
  label: 'Crowns held this month',
  /** The chip's spoken form: "Nishanebaaz: Sharpest of the season, this month so far". */
  spoken: (title: string, what: string) => `${title}: ${what}, this month so far`,
};
