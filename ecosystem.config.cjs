module.exports = {
  apps: [
    {
      name: 'zion-api',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5055,
      },
      max_memory_restart: '300M',
      time: true,
    },
  ],
};
