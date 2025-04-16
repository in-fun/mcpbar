import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { readClaudeConfig } from '../config'
import { bold, green, gray, yellow } from 'picocolors'

// No arguments for this command
interface ListArgv {}

export const command = 'list'
export const describe = 'List all configured MCP servers'
export const aliases = ['ls']

export function builder(yargs: Argv): Argv<ListArgv> {
  return yargs
}

export async function handler(_: ArgumentsCamelCase<ListArgv>) {
  try {
    const config = await readClaudeConfig()

    if (!config.mcpServers || Object.keys(config.mcpServers).length === 0) {
      logger.info(yellow('No MCP servers configured'))
      logger.info('Use the install command to add a new MCP server:')
      logger.info(gray('  mcps install <package-name>'))
      return
    }

    logger.info(bold(green('Configured MCP Servers:\n')))

    // prettier-multiline-arrays-next-threshold: 3
    Object.entries(config.mcpServers).forEach(([name, server]: [string, any]) => {
      logger.info(bold(green(`${name}:`)))
      logger.info(`  Command: ${server.command}`)
      logger.info(`  Args: ${server.args.join(' ')}`)

      if (server.env && Object.keys(server.env).length > 0) {
        logger.info('  Environment variables:')
        Object.entries(server.env).forEach(([key]) => {
          logger.info(`    ${key}: ${gray('[secure]')}`)
        })
      }

      logger.info('')
    })
  } catch (error: any) {
    logger.error(`Failed to list MCP servers: ${error.message}`)
  }
}
