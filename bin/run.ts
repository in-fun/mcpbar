#!/usr/bin/env ts-node

import yargs, { CommandModule } from 'yargs'
import { hideBin } from 'yargs/helpers'
import { config } from 'dotenv'
import { commands } from '../src'
import { bold, blue } from 'picocolors'

config()

const run = yargs(hideBin(process.argv)).scriptName('mcpbar')
run.usage(
  `Welcome to the CLI manager for ${bold(blue('MCP server'))}!
    See more on https://mcp.bar`,
)
for (const command of commands) {
  run.command(command as CommandModule)
}

run
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .alias('h', 'help')
  .alias('v', 'version')
  .parse()
