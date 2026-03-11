#!/usr/bin/env node
const { exec } = require('child_process')
// Replace with whatever you use to start your app
exec('pnpm run start', {
  cwd: __dirname
})