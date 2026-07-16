export default {
  section: {
    intro: '简介',
    concepts: '核心原理',
    cases: 'BR 形态',
    video: '教程',
  },
  intro: {
    body: 'Pensuke 法（Bars Reduction）从 HTR 态出发，通过观察 F/B 与 R/L 面上的 bar、pair、headlight 等形态，估计到达 Leave Slice 所需的半转次数，并搜索最短 LS 解。可与 FR 法配合使用。',
  },
  concepts: {
    items: [
      'HTR 后只能使用半转（U2 D2 R2 L2 F2 B2）。每个轴向（如 F/B、R/L）的 1×3 条状结构只能被该轴的面转改变。',
      '通过观察每个轴向上的 bar（整条对齐）、pair（部分对齐）和 headlight（两角同色）形态，可以直接读出该轴到达完成所需的最少半转次数（slice count）。',
      '同时降低两个轴向的 slice count，直到双方都达到 4B0（四条 bar），即完成 Leave Slice。',
      '当某条路径受阻（如中心错配的 2×2 块）时，回退几步换一条路线即可。约 40% 的 HTR 态需要先增加 slice count 才能继续。',
    ],
  },
  cases: {
    body: '下列 11 种 BR 形态以 U/D 为 LS 轴、F/B 面为例；末尾数字表示该面所需 R2/L2（或 F2/B2）次数的下限。',
  },
  sliceGroup: '{n} slice',
  videoIntro: '完整 Pensuke 法讲解（WCAID 2022MIYA01）：',
  videoLink: '打开教程',
  attribution: 'Pensuke 法参考自ぺんすけのぶろぐ及相关 FMC 社区资料。FR 形态说明见 FR 练习器。',
}
