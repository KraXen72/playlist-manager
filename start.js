#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')
const electron = require('electron')

spawn(electron, [path.join(__dirname, 'main.js')], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--experimental-sqlite' }
}).on('error', (err) => {
  console.error('Failed to start playlist-manager:', err)
})