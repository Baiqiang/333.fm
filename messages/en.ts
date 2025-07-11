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
    createdBy: 'Created By',
    signingInRequired: 'Sign in Required',
    signingToJoin: 'Sign in to join',
    signingIn: 'Signing in with WCA ...',
    notation: 'notation',
    notationURL: 'https://www.worldcubeassociation.org/regulations/#12a',
    resultTitle: '{t} Result',
    moves: '{moves} moves',
    all: 'All',
    basicRules: 'Basic Rules',
    filterBy: {
      label: 'Filter By',
    },
    sortBy: {
      label: 'Sort By',
      moves: 'Moves',
      sumittedAt: 'Submitted At',
      fewest: 'Fewest',
      latest: 'Latest',
      mostContinuations: 'Most Continuations',
    },
    spoiler: 'Spoiler for {for}. Click to see.',
    backTo: 'Back to {to}',
    insertions: {
      mode: {
        normal: 'Normal',
        inverse: 'Inverse',
        both: 'Both',
      },
    },
    total: 'Total',
    result: 'Result',
    new: 'New',
    format: 'Format',
    bo1: 'Best of 1',
    bo2: 'Best of 2',
    mo3: 'Mean of 3',
    saveAsImage: 'Save as Image',
    expand: 'Expand',
    collapse: 'Collapse',
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
      solved: '{length} to solved',
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
    likes: 'Likes',
    favorites: 'Favorites',
    name: 'Name',
    avatar: 'Avatar',
    changeName: 'Change Name',
    solutions: 'My Solutions',
    practices: 'My Practices',
    token: 'Bot Token',
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
    decline: 'Decline',
    incline: 'Incline',
    working: {
      label: 'Working Paper',
      description: 'You can upload your working papers in image format.',
    },
  },
  weekly: {
    title: 'Weekly Competition',
    shortTitle: 'Weekly',
    scrambles: 'Scramble | Scrambles',
    scramble: 'Scramble {number}',
    period: {
      started: 'Started at {start}.',
      pendingStart: 'Will start at {start}.',
      onGoing: 'Started at {start} and will end at {end}.',
      ended: 'Ended at {end}.',
    },
    join: 'Join Now',
    mode: {
      label: 'Mode',
    },
    regular: {
      label: 'Regular',
      description: 'Regular FMC rules, 1 hour limit.',
      unlimitedSubmitted: 'You have already submitted solution for unlimited mode. The result of regular mode will be DNFed.',
    },
    unlimited: {
      label: 'Unlimited',
      description: 'No time limit. You can submit many times.',
      invalid: 'Please submit better solution!',
    },
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
    seeSolutions: 'Submit your solution to see {solutions} result | Submit your solution to see {solutions} solutions',
    results: 'Results',
    unlimitedResults: 'Results (Unlimited)',
    past: 'Past Competitions',
    turnToUnlimited: {
      label: 'Turn to Unlimited',
      confirm: 'Are you sure to turn this result to unlimited mode? This is irreversible. After that, you regular result will be DNFed and you CANNOT submit solution for regular mode on this attempt.',
    },
    rules: {
      basic: {
        title: 'Basic Rules',
        rules: [
          'You can only use the {notation} that is defined in WCA regulations.',
          'For regular mode, you should finish the solve within 1 hour. Result must be submitted before submitting in unlimited mode.',
          'For unlimited mode, there\'s no time limit. You can submit many times. But only better result can be submitted.',
          'Any kind of cheating is not allowed.',
          'Comment should be submitted too. You can change it after submitting though.',
        ],
      },
    },
    previous: 'Previous',
    next: 'Next',
  },
  daily: {
    title: 'Daily Competition',
    shortTitle: 'Daily',
    past: 'Past Competitions',
    pending: 'Pending Creation',
    creation: 'Every first BO1 practice created will be the daily competition. The creator should submit valid solution on his latest practice solution.',
  },
  tutorial: {
    title: 'Tutorial',
    htrDiagram: {
      title: 'HTR Diagram',
      description: 'The amazing HTR Diagram is created by {author}.',
      author: '2013PENG02',
    },
  },
  endless: {
    title: 'Endless Challenge',
    shortTitle: 'Endless',
    description: 'Endless Challenge is a new event that you can challenge yourself to pass through levels as many as possible. It\'s a pre-alpha version. The rules may change in the future.',
    rules: [
      'Only valid solutions can be submitted.',
      'At the beginning, all people will start from level 1.',
      'New level will open once one of the following conditions is satisfied:',
      'Each level\'s scramble is visible after you enter the level.',
      'Each level\'s solutions are visible after you submit a valid result.',
      'Any kind of cheating is not allowed.',
    ],
    challenge: {
      any: 'A person submits a valid solution.',
      single: 'A person gets a result that is less than or equal to {moves} moves.',
      team: '{persons} persons get results that are less than or equal to {moves} moves.',
    },
    level: 'LV {level}',
    progress: {
      title: 'Progress',
      competitors: '{competitors} People',
    },
    continue: 'Continue',
    previous: 'Previous Level',
    next: 'Next Level',
    toBeContinued: 'To be Continued',
    kickedBy: 'Kicked by',
    kickCondition: 'Next Level: A result that ≤{single} moves or {persons} results that ≤{team} moves submitted.',
    stats: {
      title: 'Statistics',
      singles: 'Best Singles',
      means: 'Best Means',
      rollingMo3: 'Best Rolling Mo3',
      rollingAo5: 'Best Rolling Ao5',
      rollingAo12: 'Best Rolling Ao12',
      highestLevels: 'Highest Levels',
      personal: 'Personal Stats',
      moves: 'Moves',
      count: 'Count',
      level: 'Level',
    },
    openAt: 'Open at {time}.',
    kickedAt: 'Kicked at {time}.',
    mode: {
      description: 'This only marks the mode of the solution.',
    },
    unlimited: {
      description: 'No time limit. Try to get good solutions.',
    },
    type: [
      'Regular endless challenge with same requirements for every level.',
      'Every 10th level is a boss level with difficulty increased. And difficulty increases a little every 10 levels.',
      'The EO practice has EO done in every scramble.',
      'The DR practice has DR done in every scramble.',
      'The HTR practice has HTR done in every scramble.',
      'In the hidden scramble challenge, the scramble is hidden and only the scrambled state is given. It means you need to clone a scrambled cube by yourself.',
      'The JZP practice has JZP done in every scramble.',
    ],
    showAll: 'Show All',
    ended: 'The following challenges have ended. No new level will be added. You can submit solutions to the existing levels.',
  },
  result: {
    rank: 'Rank',
    name: 'Name',
    best: 'Best',
    mean: 'Mean',
    solves: 'Solves',
    single: 'Single',
    challenge: 'Challenge',
    competition: 'Competition',
    round: 'Round',
    roundType: {
      1: 'First',
      d: 'First',
      2: 'Second',
      e: 'Second',
      3: 'Semi Final',
      g: 'Semi Final',
      f: 'Final',
      c: 'Final',
    },
    week: 'Week',
    type: {
      weekly: 'Weekly',
      daily: 'Daily',
      practice: 'Practice',
      endless: 'Endless',
      wca: 'WCA',
    },
    moveCount: 'Move Count',
  },
  chain: {
    title: 'FMC Chain',
    shortTitle: 'Chain',
    description: 'FMC Chain is a new event that everyone can submit a partial solution to continue the previous one. You can submit in different phases like EO, DR, L3E, L3C3E, etc. A solution is chained by the previous one. Finally all solutions make a big tree for the given scramble.',
    rules: [
      'Only different solutions can be submitted.',
      'Each solution should let the cube be more closer to solved.',
      'In some phases like EO, DR and HTR, the last move must be clockwise. No meaningless half-turns are allowed.',
      'Inverse moves are allowed and must be marked with "()" or "^()". "NISS" is not allowed for not mixing with "()".',
    ],
    continue: 'Continue',
    continuances: '{n} Continuance | {n} Continuances',
    finishes: '{n} Finish | {n} Finishes',
    best: 'Best',
    tip: 'Click on the scramble or each phase to get back to the corresponding phase.',
    bestResults: 'Best Results',
    duplicate: 'This solution has been submitted by someone else.',
    status: {
      yet: 'Yet Started',
      declined: 'Declined',
      viewed: 'Viewed',
      latest: 'My Latest Submission',
      notification: 'New Submission',
    },
  },
  practice: {
    title: 'Practice Book',
    shortTitle: 'Practice',
    new: {
      title: 'New Practice',
    },
    user: {
      title: '{name}\'s Practice Book',
      index: '{name}\'s Practice #{index}',
    },
    latest: 'Latest Practice',
    mostAttended: 'Most Attended',
    mostPractices: 'Most Practices',
    index: 'Practice #{index}',
    practices: '1 Practice | {n} Practices',
    previous: 'Previous',
    next: 'Next',
    created: 'Created Practices',
    joined: 'Joined Practices',
  },
  profile: {
    pr: 'Personal Records on 333.fm',
    noRecord: 'No Record',
  },
  bot: {
    token: {
      description: 'Bot Token is a one-time credential for binding user information on 333.fm with QQ groups.',
    },
  },
  league: {
    title: 'League',
    description: 'The competition is played in the form of a league, where each competitor plays every other competitor in the form of head-to-head matches (one per week).',
    nav: {
      summary: 'Summary',
      tiers: 'Tiers',
      schedules: 'Schedules',
      standings: 'Standings',
      week: 'Week {week}',
      rules: 'Rules',
    },
    standing: {
      competitors: 'Competitors',
      sets: 'Sets',
      pts: 'PTS',
      wins: 'W',
      draws: 'D',
      losses: 'L',
      bestMo3: 'Best Mo3',
    },
    allResults: 'Results (all)',
    summary: {
      players: 'Players',
      weeks: 'Weeks',
      tiers: 'Tiers',
      ongoing: 'Ongoing',
      past: 'Past',
      upcoming: 'Upcoming',
    },
    mode: {
      participants: 'Participants',
      others: 'Others',
    },
    rules: {
      format: 'The competition is played in the form of a league, where each competitor plays every other competitor in the form of head-to-head matches (one per week).',
      sets: 'Every match is decided by sets. Getting a better result on a scramble means winning the set (1-0) and drawing on a scramble means drawing a set (0.5-0.5).',
      winner: 'The winner of a match is the player who gained more points from sets.',
      ranking: 'Players are ranked in the table based on the sum of the points from all duels, with 2 points for a win, 1 point for a draw and 0 points for a loss.',
      others: 'You aren\'t in the league. You can submit solutions for the scrambles without gaining points and see other results.',
      basic: [
        'You can only use the {notation} that is defined in WCA regulations.',
        'You should finish the solve within 1 hour.',
        'Any kind of cheating is not allowed.',
        'Don\'t post any spoilers about current week\'s scrambles until it\'s over.',
        'Comment should be submitted too. You can change it after submitting though.',
      ],
      criteria: 'Player classification criteria:',
      tierBreakers: [
        'Number of points',
        'Head-to-head matchup (if more than one player: small table for those players only)',
        'Number of wins',
        'Best single mo3 of the entire tournament, ',
        '2nd best mo3 and so on..',
      ],
    },
  },
}
