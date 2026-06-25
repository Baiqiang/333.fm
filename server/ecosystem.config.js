module.exports = {
  apps: [
    {
      name: '333.fm-server',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
}
