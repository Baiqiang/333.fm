export default {
  title: 'Fewest Moves',
  header: {
    signIn: 'Sign in',
    signOut: 'Sign out',
  },
  common: {
    id: 'ID',
    wcaId: 'WCA ID',
    email: 'Email',
    home: 'Home',
    status: 'Status',
    yes: 'Yes',
    createdAt: 'Created At',
    signingInRequired: 'Sign in Required',
    signingIn: 'Signing in with WCA ...',
    notation: 'notation',
    notationURL: 'https://www.worldcubeassociation.org/regulations/#12a',
    resultTitle: '{t} Result',
    moves: '{moves} moves',
  },
  error: {
    400: 'Bad Request',
    403: 'Forbidden',
    404: 'Page not found',
    other: 'An error occurred',
  },
  loading: 'Loading...',
  description: {
    if: 'This is insertion finder.',
    sf: 'This is slicey finder.',
  },
  index: {
    defination: '{title} (or {or} {fmc}) is an event where competitors attempt to solve a puzzle (almost always the 3x3x3) in as few moves as possible, starting from a given scramble. {wiki}',
    speedsolvingWiki: 'SpeedSolving.com Wiki',
    latest: 'Latest Findings',
  },
  sf: {
    title: 'Slicey Finder',
    shortTitle: 'SF',
    description: 'It\'s a useful tool to check the slicey insertions for 3x3x3 Fewest Moves.',
  },
  if: {
    title: 'Insertion Finder',
    shortTitle: 'IF',
    description: 'It\'s a useful tool to check the optimal insertions for 3x3x3 Fewest Moves.',
    latest: 'Latest IF',
    find: 'Find Again',
    name: {
      label: 'Name',
      description: 'You can type something to identify this insertion.',
    },
    scramble: {
      label: 'Scramble',
      description: 'Please don\'t input any invalid {notation}.',
      invalid: 'Please check your scramble!',
    },
    skeleton: {
      label: 'Skeleton',
      description: 'Only the followings are allowed:',
      invalid: 'Please check your skeleton!',
      list: [
        'WCA {notation}.',
        '"()" or "^()" for inverse moves. "NISS" for switching scramble. But "()" and "NISS" can\'t be used at the same time.',
        'Any content after "//" in each line will be considered as comments.',
      ],
      to: '{length} to {detail}',
    },
    algs: {
      'label': 'Algorithms',
      'description': 'Please choose at least one algorithm.',
      'corner': {
        label: 'Corners',
      },
      'edge': {
        label: 'Edges',
      },
      'other': {
        label: 'Other',
      },
      'extra': {
        label: 'Extra',
      },
      '3CP': {
        label: '3 Corners',
        description: '',
      },
      '3CP-pure': {
        label: 'Pure 3 Corners',
        description: '',
      },
      '2x2CP': {
        label: '2-2 Corners',
        description: '',
      },
      'CO': {
        label: 'Corner Twists',
        description: '',
      },
      'C-other': {
        label: 'Other Corners',
        description: '',
      },
      '3EP': {
        label: '3 Edges',
        description: '',
      },
      '2x2EP': {
        label: '2-2 Edges',
        description: '',
      },
      'EO': {
        label: 'Edge Flips',
        description: '',
      },
      '3CP3EP': {
        label: '3 Corners and 3 Edges',
        description: '',
      },
      'E-other': {
        label: 'Other Edges',
        description: '',
      },
      'parity': {
        label: 'Parity',
        description: '',
      },
      'center': {
        label: 'Center',
        description: '',
      },
      'no-parity-other': {
        label: 'Other Algs without Parity',
        description: '',
      },
      'extras/parity': {
        label: 'Extra Parity',
      },
      'extras/no-parity-other': {
        label: 'Extra Algs without Parity',
      },
      'all': 'All',
      'none': 'None',
      'necessary': 'Necessary',
    },
    greedy: {
      label: 'Greedy',
      description: 'It\'s a number N. Let\'s say when searching insertions for each step, the minimum moves of all skeletons is M. IF will keep all skeletons whose moves equal or less than M + N moves. 0 means always best first (human mode?).',
    },
    cycles: {
      label: 'Cycles',
      corners: 'Corners',
      edges: 'Edges',
      centers: 'Centers',
      parity: 'Parity',
    },
    status: [
      'Waiting',
      'Computing',
      'Finished',
    ],
    solutions: {
      label: 'Solutions',
      insertion: 'Insertion',
      insertions: 'Insertions',
      final: 'Final Solution',
      cancellation: 'Cancellation',
      exceed: 'There\'re too many insertions to be inserted. I don\'t want to do it.',
      noProper: 'There\'s no proper insertion.',
      merged: 'Merged',
      expanded: 'Expanded',
    },
    fewestmoves: 'Fewest Moves',
    duration: 'Calculation Duration',
  },
  user: {
    if: 'My IF',
    name: 'Name',
    avatar: 'Avatar',
    changeName: 'Change Name',
  },
  admin: {
    title: 'Admin',
    user: {
      title: 'User',
      if: '{name}\'s IF',
      ifs: 'Finder Count',
    },
    if: {
      title: 'IF',
    },
  },
  form: {
    submit: 'Submit',
    reset: 'Reset',
    save: 'Save',
    confirm: 'Confirm',
    cancel: 'Cancel',
    remove: 'Remove',
    removeConfirm: 'Are you sure to remove this?',
  },
  weekly: {
    title: 'Weekly Competition',
    shortTitle: 'Weekly',
    scrambles: 'Scramble | Scrambles',
    scramble: 'Scramble {number}',
    period: {
      pendingStart: 'Will start at {start}.',
      onGoing: 'Started at {start} and will end at {end}.',
      ended: 'Ended at {end}.',
    },
    join: 'Join Now',
    solution: {
      label: 'Solution',
      description: 'Please don\'t input any invalid {notation}.',
      invalid: 'Please check your solution!',
    },
    comment: {
      label: 'Comment',
      description: 'You can type something to describe your solution.',
    },
    confirmDNF: 'Are you sure to DNF?',
    submitted: ' (Submitted)',
    solutions: 'Solutions',
    noSolution: 'No Solution',
    seeSolutions: 'Click to see {solutions} result | Click to see {solutions} solutions',
    results: 'Results',
    past: 'Past Competitions',
  },
  tutorial: {
    htrDiagram: {
      title: 'HTR Diagram',
      description: 'The amazing HTR Diagram is authorized by {author}.',
      author: '2013PENG02',
    },
  },
}
