export function getRoadWidthMeters(tag: string): number {
  switch (tag) {
    case 'motorway':
      return 25;
    case 'primary':
      return 15;
    default:
      return 6;
  }
}

export function getWaterwayWidthMeters(tag: string): number {
  switch (tag) {
    case 'river':
      return 10;
    default:
      return 4;
  }
}

// TODO: integrate custom width tables from Map2Model project (mm -> m)
