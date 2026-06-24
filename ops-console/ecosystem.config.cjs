module.exports = {
  apps: [
    {
      name: 'irtiwaa-ops-console',
      script: './server/index.mjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
