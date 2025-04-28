import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { readClientConfig, getAvailableClients, clientPaths } from '../config'
import { green, red, yellow, gray } from 'picocolors'
import { spawn } from 'child_process'

interface StartArgv {
  server: string
  client?: string
}

export const command = 'start <server>'
export const describe = 'Start an MCP server'
export const aliases = ['s']

export function builder(yargs: Argv): Argv<StartArgv> {
  return yargs
    .positional('server', {
      type: 'string',
      description: 'Name of the MCP server to start',
      demandOption: true,
    })
    .option('client', {
      type: 'string',
      description: 'MCP client to start the server from',
      alias: 'c',
      choices: getAvailableClients(),
      default: 'claude',
    })
}

export async function handler(argv: ArgumentsCamelCase<StartArgv>) {
  try {
    const serverName = argv.server as string
    const clientName = argv.client as string

    // Verify client is supported
    if (!clientPaths[clientName]) {
      logger.error(red(`Client "${clientName}" is not supported.`))
      logger.info(yellow(`Supported clients: ${getAvailableClients().join(', ')}`))
      return
    }

    // Read current config
    const config = await readClientConfig(clientName)

    if (!config.mcpServers || !config.mcpServers[serverName]) {
      logger.error(yellow(`No MCP server named "${serverName}" found in ${clientName}`))
      return
    }

    const serverConfig = config.mcpServers[serverName]

    logger.info(green(`Starting MCP server "${serverName}" from ${clientName}...`))
    logger.info(`Command: ${serverConfig.command} ${serverConfig.args.join(' ')}`)

    try {
      const child = spawn(serverConfig.command, serverConfig.args, {
        stdio: 'inherit',
        env: { ...process.env, ...serverConfig.env },
      })

      child.on('error', (error) => {
        logger.error(red(`Failed to start server: ${error.message}`))
      })

      process.on('SIGINT', () => {
        logger.info(yellow('\nStopping MCP server...'))
        child.kill('SIGINT')
      })

      logger.success(green(`MCP server "${serverName}" is running (PID: ${child.pid})`))
      logger.info(gray('Press Ctrl+C to stop the server'))

      await new Promise((resolve) => {
        child.on('close', (code) => {
          logger.info(yellow(`MCP server exited with code ${code}`))
          resolve(null)
        })
      })
    } catch (error: any) {
      logger.error(red(`Failed to start server: ${error.message}`))
    }
  } catch (error: any) {
    logger.error(`Failed to start MCP server: ${error.message}`)
  }
}
