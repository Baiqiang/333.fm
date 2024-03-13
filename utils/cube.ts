export function reverseTwists(twists: string) {
  return twists
    .split(' ')
    .map((twist) => {
      if (twist.endsWith('2'))
        return twist

      if (twist.endsWith('\''))
        return twist[0]

      return `${twist}'`
    })
    .reverse()
    .join(' ')
}
