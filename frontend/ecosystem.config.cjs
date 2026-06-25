module.exports = {
  apps: [
    {
      name: '333.fm',
      exec_mode: 'cluster',
      instances: 2,
      script: './.output/server/index.mjs',
    },
  ],
}
