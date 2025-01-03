import en from './en'

export default {
  title: '最少步',
  header: {
    signIn: '登录',
    signOut: '退出',
  },
  common: {
    id: 'ID',
    wcaId: 'WCA ID',
    email: '邮箱',
    home: '首页',
    status: '状态',
    yes: '是',
    createdAt: '创建于',
    createdBy: '创建者',
    signingInRequired: '请登录',
    signingToJoin: '请登录后参加',
    signingIn: '正在使用 WCA 登录 ...',
    notation: '转动步骤',
    notationURL: 'https://www.worldcubeassociation.org/regulations/translations/chinese/#12a',
    resultTitle: '{t}结果',
    moves: '{moves}步',
    all: '全部',
    basicRules: '基本规则',
    filterBy: {
      label: '筛选',
    },
    sortBy: {
      label: '排序',
      moves: '步数',
      sumittedAt: '提交时间',
      fewest: '最少',
      latest: '最新',
      mostContinuations: '最多续接',
    },
    spoiler: '点击剧透{for}。',
    backTo: '返回{to}',
    insertions: {
      mode: {
        normal: '正序',
        inverse: '逆序',
        both: '双向',
      },
    },
    total: '总计',
    result: '成绩',
    new: '新建',
    format: '赛制',
    bo1: '单次计最好',
    bo2: '两次计最好',
    mo3: '三次计平均',
    saveAsImage: '保存为图片',
  },
  error: {
    400: '错误请求',
    403: '没有权限',
    404: '页面未找到',
    other: '发生了一个错误',
  },
  loading: '加载中...',
  description: {
    if: '这个是最少步找插入工具。',
    sf: '这个是最少步插中层工具。',
  },
  index: {
    defination: '{title}（或称最少步挑战、{fmc}）是选手根据给定的打乱公式，尝试用尽可能少的步数还原魔方（通常是三阶）的项目。{wiki}',
    speedsolvingWiki: 'SpeedSolving.com 维基百科',
    latest: '最新插入',
  },
  sf: {
    title: '插中层',
    shortTitle: '中层',
    description: '一个利用插入中层将复原步骤变短的工具。',
  },
  if: {
    title: '找插入',
    shortTitle: '插入',
    description: '一个用于检查三阶最少步插入是否最优的实用工具。',
    latest: '最近的插入',
    find: '再找一次',
    name: {
      label: '名称',
      description: '可以输入一些用以区分这条插入的文字。',
    },
    scramble: {
      label: '打乱',
      description: '请勿输入任何非法{notation}！',
      invalid: '请检查你的打乱！',
    },
    skeleton: {
      label: '复原',
      description: '只允许以下输入：',
      invalid: '请检查你的复原！',
      list: [
        'WCA{notation}；',
        '"()"或"^()"表示逆序；"NISS"用以切换打乱正序或者逆序；二者不可混合使用；',
        '每一行的"//"及其之后的内容表示注释。',
      ],
      to: '{length}步剩{detail}',
      solved: '{length}步还原',
    },
    algs: {
      'label': '公式集',
      'description': '',
      'corner': {
        label: '角块',
      },
      'edge': {
        label: '棱块',
      },
      'other': {
        label: '其他',
      },
      'extra': {
        label: '额外',
      },
      '3CP': {
        label: '三角换',
        description: '',
      },
      '3CP-pure': {
        label: '纯粹三角换',
        description: '',
      },
      '2x2CP': {
        label: '2-2角',
        description: '',
      },
      'CO': {
        label: '翻角',
        description: '',
      },
      'C-other': {
        label: '其他角块',
        description: '',
      },
      '3EP': {
        label: '三棱换',
        description: '',
      },
      '2x2EP': {
        label: '2-2棱',
        description: '',
      },
      'EO': {
        label: '翻棱',
        description: '',
      },
      'E-other': {
        label: '其他棱块',
        description: '',
      },
      '3CP3EP': {
        label: '三角三棱换',
        description: '',
      },
      'parity': {
        label: 'Parity',
        description: '',
      },
      'center': {
        label: '中心',
        description: '',
      },
      'no-parity-other': {
        label: '其他没有parity的公式',
        description: '',
      },
      'extras/parity': {
        label: '额外Parity',
      },
      'extras/no-parity-other': {
        label: '额外没有parity的公式',
      },
      'all': '全选',
      'none': '全不选',
      'necessary': '仅选择必要',
    },
    greedy: {
      label: '搜索参数',
      description: '设置一个数字 N ，假设每次搜索得到的众多复原步骤中最短的一个步数为 M，则保留步数小于等于 M + N的复原进行下一步搜索。0 意味着永远是最优消去优先（近似人脑模式）。',
    },
    cycles: {
      label: '循环',
      corners: '角块',
      edges: '棱块',
      centers: '中心',
      parity: 'Parity',
    },
    status: [
      '等待中',
      '计算中',
      '已完成',
    ],
    solutions: {
      label: '解法',
      insertion: '插入',
      insertions: '插入个数',
      final: '最终解法',
      cancellation: '消去步数',
      exceed: '你妹的，要插入的循环太多了',
      noProper: '找不到合适的插入',
      merged: '合并',
      expanded: '展开',
    },
    fewestmoves: '最少步数',
    duration: '计算耗时',
  },
  user: {
    if: '我的插入',
    likes: '赞过',
    favorites: '收藏',
    name: '姓名',
    avatar: '头像',
    changeName: '修改名称',
    solutions: '我的解法',
    practices: '我的练习',
    token: '机器人 Token',
  },
  admin: {
    title: '管理',
    user: {
      title: '用户',
      if: '{name}的插入',
      ifs: '找插入数',
    },
    if: {
      title: '插入',
    },
  },
  form: {
    submit: '提交',
    reset: '重置',
    save: '保存',
    confirm: '确认',
    cancel: '取消',
    remove: '删除',
    removeConfirm: '确认要删除这条记录吗？',
    decline: '弃疗',
    incline: '不放弃',
    working: {
      label: '草稿纸',
      description: '可以上传图片格式的草稿纸。',
    },
  },
  weekly: {
    title: '周赛',
    shortTitle: '周赛',
    scrambles: '打乱',
    scramble: '打乱{number}',
    period: {
      started: '于{start}已开始。',
      pendingStart: '将于{start}开始。',
      onGoing: '{start}开始至{end}结束。',
      ended: '已于{end}结束。',
    },
    join: '立即参加',
    solution: {
      label: '解法',
      description: '请勿输入任何非法{notation}！',
      invalid: '请检查你的解法！',
    },
    comment: {
      label: '备注',
      description: '可以输入一些解法过程，或者随便什么。',
    },
    mode: {
      label: '模式',
    },
    regular: {
      label: '常规',
      description: '常规最少步规则，限时1小时。',
      unlimitedSubmitted: '你已经提交了狂野模式的解法，常规模式的成绩将被 DNF。',
    },
    unlimited: {
      label: '狂野',
      description: '时间不限，尽可能取得好解法。',
      invalid: '请提交更好的解法！',
    },
    confirmDNF: '确认要 DNF 掉吗？',
    submitted: '（已提交）',
    solutions: '解法',
    noSolution: '暂无解法',
    seeSolutions: '提交之后方可查看其他{solutions}个解法',
    results: '成绩',
    unlimitedResults: '成绩（狂野）',
    past: '往期周赛',
    turnToUnlimited: {
      label: '转为狂野模式',
      confirm: '确认要将本次成绩转为狂野模式吗？此操作不可撤销，转换之后常规模式的成绩将被 DNF。',
    },
    rules: {
      basic: {
        title: '基本规则',
        rules: [
          '只能使用 WCA 官方规则规定的{notation}；',
          '常规模式每个打乱应该在 1 小时内完成；成绩必须在狂野模式提交之前提交；',
          '狂野模式没有时间限制，可以多次提交，但只能提交更好的成绩。',
          '任何形式的作弊都是不允许的；',
          '备注也应一并提交，不过提交解法后仍可修改。',
        ],
      },
    },
    previous: '上一期',
    next: '下一期',
  },
  daily: {
    title: '日赛',
    past: '往期日赛',
    pending: '仍未创建今日赛事',
    creation: '每日首个创建的 BO1 练习将成为当日日赛，创建者需有效提交他最新一次练习的解法。',
  },
  tutorial: {
    title: '教程',
    htrDiagram: {
      title: 'HTR 迷宫图',
      description: 'HTR 迷宫图由{author}倾情创作。',
      author: '天方魔',
    },
  },
  endless: {
    title: '无尽挑战',
    shortTitle: '爬塔',
    description: '无尽挑战是一个最少步新玩法，快来一起爬塔吧！当前是预开发版本，之后规则可能会有所调整。',
    rules: [
      '只有有效解法才能提交；',
      '每个人都从第一层开始；',
      '满足以下条件之一即可开启下一层：',
      '每一层的打乱在进入关卡之后才能看到；',
      '每一层在提交有效解法后方可查看其他选手的解法;',
      '任何形式的作弊都是不允许的。',
    ],
    challenge: {
      any: '有人提交了有效解法',
      single: '有人提交了少于等于 {moves} 步的解法；',
      team: '有 {persons} 人提交了少于等于 {moves} 步的解法；',
    },
    level: '{level} 层',
    progress: {
      title: '无尽之塔',
      competitors: '{competitors} 人',
    },
    continue: '继续旅程',
    previous: '上一层',
    next: '下一层',
    toBeContinued: '未完待续',
    kickedBy: '破关者',
    kickCondition: '下一关开启：有人提交 ≤{single} 步或者 {persons} 个人提交 ≤{team} 步。',
    stats: {
      title: '统计',
      singles: '最佳单次',
      means: '最佳平均',
      rollingMo3: '最佳滚动 Mo3',
      rollingAo5: '最佳滚动 Ao5',
      rollingAo12: '最佳滚动 Ao12',
      highestLevels: '最高层数',
      personal: '个人统计',
      moves: '步数',
      count: '次数',
      level: '层数',
    },
    openAt: '{time}开放。',
    kickedAt: '{time}破关。',
    mode: {
      description: '仅标记一下解法的模式。',
    },
    unlimited: {
      description: '时间不限，尽可能取得好解法。',
    },
    type: [
      '常规爬塔，每一层要求一样。',
      'Boss 挑战，每个整 10 关难度大提升，每过 10 关难度稍微提升。',
      'EO 练习塔，每个打乱的 EO 已做好。',
      'DR 练习塔，每个打乱的 DR 已做好。',
      'HTR 练习塔，每个打乱的 HTR 已做好。',
      '无打乱挑战，只给出打乱状态，需要自行克隆魔方。',
      'JZP 练习塔，每个打乱的 JZP 已做好。',
    ],
    showAll: '显示全部',
    ended: '以下挑战已结束，不再增加新关卡，仍可提交解法。',
  },
  result: {
    rank: '排名',
    name: '姓名',
    best: '单次',
    mean: '平均',
    solves: '成绩',
    single: '单次',
    challenge: '赛事',
    competition: '比赛',
    round: '轮次',
    roundType: {
      1: '初赛',
      d: '初赛',
      2: '复赛',
      e: '复赛',
      3: '半决赛',
      g: '半决赛',
      f: '决赛',
      c: '决赛',
    },
    week: '周',
    type: {
      weekly: '周赛',
      daily: '日赛',
      practice: '练习',
      endless: '爬塔',
      wca: 'WCA',
    },
    moveCount: '步数统计',
  },
  chain: {
    title: '最少步链',
    shortTitle: '链',
    description: '最少步链是一个全新的玩法，每个人在之前的基础上提交一个不同的局部解法，可以是EO、DR、HTR或者L3E之类的。每个解法链接在上一个解法上，最终所有的解法将会变成一颗最少步树。',
    rules: [
      '只能提交不同的解法；',
      '每个解法应该让魔方离复原态更近；',
      '在某些阶段中最后一步必须是顺时针，如 EO、DR或者HTR，且不允许无意义的 HT；',
      '逆序解法只能放在“()”或者“^()”里，不允许使用“NISS”。',
    ],
    continue: '续接',
    continuances: '{n} 个续接',
    finishes: '{n} 个完整解法',
    best: '最佳成绩',
    tip: '点击打乱或者各阶段解法可以返回对应阶段。',
    bestResults: '最佳成绩',
    duplicate: '该解法已有人提交',
    status: {
      yet: '还没看',
      declined: '弃疗',
      viewed: '已看',
      latest: '最新提交',
      notification: '有新提交',
    },
  },
  practice: {
    title: '练习本',
    new: {
      title: '新建练习',
    },
    user: {
      title: '{name}的练习本',
      index: '{name}的练习 {index}',
    },
    latest: '最新练习',
    mostAttended: '最多参加',
    mostPractices: '最多练习',
    index: '练习 {index}',
    practices: '{n} 次练习',
    previous: '上一个',
    next: '下一个',
    created: '创建的练习',
    joined: '参与的练习',
  },
  profile: {
    pr: '333.fm 个人纪录',
    noRecord: '暂无纪录',
  },
  bot: {
    token: {
      description: '机器人 Token 是用于 QQ 群绑定 333.fm 的用户信息的一次性凭证。',
    },
  },
}
