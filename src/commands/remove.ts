import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { readClientConfig, writeClientConfig, getAvailableClients, clientPaths } from '../config'
import { green, yellow, red } from 'picocolors'

interface RemoveArgv {
  server: string
  force?: boolean
  client?: string
}

export const command = 'remove <server>'
export const describe = 'Remove a configured MCP server'
export const aliases = ['rm']

export function builder(yargs: Argv): Argv<RemoveArgv> {
  return yargs
    .positional('server', {
      type: 'string',
      description: 'Name of the MCP server to remove',
      demandOption: true,
    })
    .option('force', {
      type: 'boolean',
      description: 'Remove without confirmation',
      alias: 'f',
      default: false,
    })
    .option('client', {
      type: 'string',
      description: 'MCP client to remove the server from',
      alias: 'c',
      choices: getAvailableClients(),
      default: 'claude',
    })
}

export async function handler(argv: ArgumentsCamelCase<RemoveArgv>) {
  try {
    const serverName = argv.server as string
    const force = argv.force as boolean
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

    // Get confirmation unless forced
    let shouldRemove = force

    if (!force) {
      shouldRemove = await logger.prompt(
        `Are you sure you want to remove the MCP server "${serverName}" from ${clientName}?`,
        {
          type: 'confirm',
          default: false,
        },
      )

      if (!shouldRemove) {
        logger.info(yellow('Operation cancelled'))
        return
      }
    }

    // Remove server from config
    delete config.mcpServers[serverName]

    // Write updated config
    await writeClientConfig(clientName, config)

    logger.success(green(`✅ Successfully removed MCP server "${serverName}" from ${clientName}`))
  } catch (error: any) {
    logger.error(`Failed to remove MCP server: ${error.message}`)
  }
}
