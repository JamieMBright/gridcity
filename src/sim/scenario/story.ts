// The Night the Grid Vanished — the campaign's framing fiction.
// Why is the map dark? Because every tower, transformer and cable in
// the licence area disappeared overnight. No fault recorded, no debris,
// no explanation. You are the operator Ofgem dragged out of bed.

/** Ofgem's year-1 allowed revenue for the rebuild, £k (network capex). */
export const ALLOWANCE_Y1_K = 250_000;

/** The opening beats, shown letterboxed and skippable on a new game. */
export const STORY_BEATS: Array<{ title: string; body: string }> = [
  {
    title: '03:47, last night',
    body:
      'At 03:47 every substation alarm in the licence area fired at once — ' +
      'and then went silent. Not tripped. Gone. Dawn found empty fields ' +
      'where four hundred kilovolts used to hum: no towers, no cables, no ' +
      'transformers. No debris. Not a single bolt left behind.',
  },
  {
    title: 'A mighty strange occurrence',
    body:
      'The inquiry will take years and explain nothing. The select ' +
      'committee will use the words "unprecedented" and "concerning". ' +
      'Nine million people use a different word: dark. The city, the ' +
      'towns, the estuary — every one of them is waiting for power that ' +
      'no longer has anywhere to flow.',
  },
  {
    title: 'The letter',
    body: '', // rendered as the Ofgem letter component
  },
];

/** Year-1 mystery fragments for the GRID WIRE ticker (woven among the
 *  ambient headlines while the rebuild is young). */
export const STORY_FRAGMENTS: string[] = [
  'inquiry update: no fault recorded at any site on the night — "the kit simply isn\'t there"',
  'satellite firm claims pre-dawn imagery shows towers present at 03:46 and absent at 03:48',
  'select committee summons the former operator; former operator cannot be located either',
  'scrap-metal market unmoved: "nobody has tried to sell us a grid," traders confirm',
  'conspiracy forums divided between magnets, auroras and "a very organised crane company"',
  'insurance underwriters invent new category: "inexplicable total infrastructure loss"',
  'walkers report a single insulator disc found in a hedge near Ongar; police tape deployed',
  'astronomers note nothing unusual that night, "apart, obviously, from the grid"',
];

/** True while the rebuild-directive framing applies (year 1). */
export function inRebuildYear(simTimeMin: number): boolean {
  return simTimeMin < 365 * 1440;
}
