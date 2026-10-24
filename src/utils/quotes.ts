// The line under the note. Appears only once the day has a mood, and which
// pool it comes from is the mood's doing — that's the whole feature.
//
// Three pools, not two, because the scale has seven steps and a flat `okay`
// day fits neither a consolation nor a celebration. The bands are the two arms
// of the mood ramp plus the neutral, so they line up with the colour the day is
// already wearing.
//
// Every line here was either pulled from a primary text, cited on Wikiquote, or
// is anonymous internet vernacular with no author claimed — see
// docs/quotes-research.md, which also records the 61 candidates that were cut
// and why. Authors are kept in trailing comments for provenance only; the UI
// shows the line alone.
//
// The seven rules the pools were built to, from blind-testing an earlier draft
// (three raters, one mood each, no knowledge of the app). Any line added later
// has to clear all seven:
//
//   1. No imperative. A line that hands the reader a job scored 1-2 every
//      time, unless a hedge or a joke undercuts it.
//   2. One sentence, parseable in one pass, on a phone, late at night.
//   3. Never imply the mood was a choice or the day a performance. "Attitude
//      is a choice" lines read as blame and contradict the mood axis.
//   4. Don't point at "the day" as the unit of account — widen the frame past
//      today, or grant permission to be unremarkable.
//   5. Modern plain syntax. A stiff translation loses before its content is
//      weighed.
//   6. If it's on a tote bag, it's spent.
//   7. Melancholy about something ending is fine. Mortality is not.

export type MoodBand = 'rough' | 'level' | 'bright'

/** Which pool a mood step draws from: the ramp's two arms, plus the neutral. */
export function moodBand(mood: number): MoodBand {
  if (mood <= 2) return 'rough'
  if (mood === 3) return 'level'
  return 'bright'
}

const ROUGH: string[] = [
  "I can't go on, I'll go on.",                                                                     // Samuel Beckett, The Unnamable
  'You do not have to be good.',                                                                    // Mary Oliver, "Wild Geese"
  'The best way out is always through.',                                                            // Robert Frost, "A Servant to Servants"
  'The world breaks everyone, and afterward many are strong at the broken places.',                 // Hemingway, A Farewell to Arms
  'Now is no time to think of what you do not have. Think of what you can do with what there is.',  // Hemingway, The Old Man and the Sea
  'Not everything that is faced can be changed, but nothing can be changed until it is faced.',     // James Baldwin
  'Almost everything will work again if you unplug it for a few minutes, including you.',           // Anne Lamott
  'The game of life is hard, and a lot of us are playing hurt.',                                    // Anne Lamott
  "Lighthouses don't go running all over an island looking for boats to save. They just stand there shining.", // Anne Lamott
  'A step backward, after making a wrong turn, is a step in the right direction.',                  // Kurt Vonnegut, Player Piano
  "You were sick, but now you're well, and there's work to do.",                                    // Kurt Vonnegut, Timequake
  'Things are getting worse faster than I can lower my standards.',                                 // Carrie Fisher
  'Everything makes sense a bit at a time. But when you try to think of it all at once, it comes out wrong.', // Terry Pratchett, Diggers
  'Hope is optimism with a broken heart.',                                                          // Nick Cave, Faith, Hope and Carnage
  "It's a bad day, not a bad life.",                                                                // vernacular
  'Rest is not a reward for work completed.',                                                       // vernacular
  'You are not behind. There is no schedule.',                                                      // vernacular
  'Did you eat today? Did you drink water? That counts.',                                           // vernacular
  'Motivation comes after you start, not before.',                                                  // vernacular
  "Progress isn't linear.",                                                                         // vernacular
  "You've gotten through every day so far.",                                                        // vernacular
  "Feelings aren't facts.",                                                                          // vernacular
  "You're allowed to start over.",                                                                  // vernacular
  'One day at a time.',                                                                             // vernacular (recovery)
  'Just do the next right thing.',                                                                  // vernacular (recovery)
  'Shower, eat, go outside. In that order.',                                                        // vernacular
]

const LEVEL: string[] = [
  'I exist as I am, that is enough.',                                                               // Walt Whitman, "Song of Myself"
  'The years teach much which the days never know.',                                                // Emerson, "Experience"
  'Happiness, too, is a long patience.',                                                            // Albert Camus
  'Keep some room in your heart for the unimaginable.',                                             // Mary Oliver, "Evidence"
  "We are here on Earth to fart around. Don't let anybody tell you any different.",                 // Kurt Vonnegut, A Man Without a Country
  "A vital ingredient of success is not knowing that what you're attempting can't be done.",        // Terry Pratchett
  'Find out who you are and do it on purpose.',                                                     // Dolly Parton
  'The days are long but the decades are short.',                                                   // Sam Altman
  'You are allowed to be both a masterpiece and a work in progress, simultaneously.',               // Sophia Bush
  'Nobody is thinking about you as much as you think.',                                             // vernacular
  "It's not that deep.",                                                                            // vernacular
  'Most days are just days.',                                                                       // vernacular
  'Low effort still counts.',                                                                       // vernacular
  'You can just do things.',                                                                        // vernacular
]

const BRIGHT: string[] = [
  'Be joyful though you have considered all the facts.',                                            // Wendell Berry
  'Every day I see or hear something that more or less kills me with delight.',                     // Mary Oliver, "Mindful"
  "This is a wonderful day. I've never seen this one before.",                                      // Maya Angelou
  'I believe in kindness. Also in mischief. Also in singing.',                                      // Mary Oliver, "Evidence"
  'That it will never come again is what makes life so sweet.',                                     // Emily Dickinson
  'Autumn is a second spring, when every leaf is a flower.',                                        // attributed to Camus
  "If this isn't nice, I don't know what is.",                                                      // Kurt Vonnegut
  'Laughter is carbonated holiness.',                                                               // Anne Lamott, Plan B
  'We must have the stubbornness to accept our gladness in the ruthless furnace of this world.',    // Jack Gilbert
  "It's hard to be a diamond in a rhinestone world.",                                               // Dolly Parton
  'Everything was beautiful and nothing hurt.',                                                     // Kurt Vonnegut, Slaughterhouse-Five
  'Let yourself have this.',                                                                        // vernacular
  'Good days count too.',                                                                           // vernacular
  'Normalize being happy for no reason.',                                                           // vernacular
]

const POOLS: Record<MoodBand, string[]> = { rough: ROUGH, level: LEVEL, bright: BRIGHT }

/** FNV-1a. Any stable string hash would do; this one is short and has no deps. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * The line for a given day and mood, or null if the day isn't rated.
 *
 * Keyed on the date and the *band* — not the mood step — so it is stable in
 * both directions that matter. A given day always shows the same line (nothing
 * reshuffles while you type, and yesterday reads the same tomorrow), and moving
 * the rail inside one band doesn't swap it either: only crossing into another
 * arm of the ramp does, which is the one time a different line is the point.
 *
 * Deliberately derived rather than stored. A quote saved onto the day would be
 * a second thing to migrate, export and version, and it would freeze whatever
 * the pool happened to be on the day you rated it.
 */
export function quoteForDay(date: string, mood: number | null): string | null {
  if (mood === null) return null
  const band = moodBand(mood)
  const pool = POOLS[band]
  return pool[hash(`${date}:${band}`) % pool.length]
}
