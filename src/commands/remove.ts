import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { readClaudeConfig, writeClaudeConfig } from '../config'
import { green, yellow } from 'picocolors'

interface RemoveArgv {
  server: string
  force?: boolean
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
}

export async function handler(argv: ArgumentsCamelCase<RemoveArgv>) {
  try {
    const serverName = argv.server as string
    const force = argv.force as boolean

    // Read current config
    const config = await readClaudeConfig()

    if (!config.mcpServers || !config.mcpServers[serverName]) {
      logger.error(yellow(`No MCP server named "${serverName}" found`))
      return
    }

    // Get confirmation unless forced
    let shouldRemove = force

    if (!force) {
      shouldRemove = await logger.prompt(`Are you sure you want to remove the MCP server "${serverName}"?`, {
        type: 'confirm',
        default: false,
      })

      if (!shouldRemove) {
        logger.info(yellow('Operation cancelled'))
        return
      }
    }

    // Remove server from config
    delete config.mcpServers[serverName]

    // Write updated config
    await writeClaudeConfig(config)

    logger.success(green(`✅ Successfully removed MCP server "${serverName}"`))
  } catch (error: any) {
    logger.error(`Failed to remove MCP server: ${error.message}`)
  }
}
