export default {
  section: {
    intro: 'Introduction',
    concepts: 'Core concepts',
    cases: 'BR shapes',
    video: 'Tutorial',
  },
  intro: {
    body: 'The Pensuke method (Bars Reduction) works from HTR by reading bar/pair/headlight patterns on the two side face pairs to bound half-turn counts toward Leave Slice.',
  },
  concepts: {
    items: [
      'After HTR only half-turns (U2 D2 R2 L2 F2 B2) are allowed. Each axis pair (e.g. F/B, R/L) has 1×3 column groups that can only be changed by that axis\'s face turns.',
      'By reading bar (full column), pair (partial match) and headlight (matching corners) patterns on each axis, you can directly read out the minimum half-turn count (slice count) needed to solve that axis.',
      'Reduce both axes\' slice counts simultaneously until both reach 4B0 (four bars) — that is Leave Slice.',
      'When a route is blocked (e.g. center-mismatched 2×2 block), backtrack a few moves and try another path. About 40% of HTR states require temporarily increasing the slice count.',
    ],
  },
  cases: {
    body: 'Eleven BR labels shown for U/D LS axis and F/B faces; the last digit is a lower bound on required face half-turns.',
  },
  sliceGroup: '{n} slice',
  videoIntro: 'Full Pensuke walkthrough (WCAID 2022MIYA01):',
  videoLink: 'Open tutorial',
  attribution: 'Pensuke method references pensuke blog and FMC community writeups. See FR trainer for FR shapes.',
}
