import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { readClientConfig, getAvailableClients, clientPaths } from '../config'
import { bold, green, gray, yellow, red } from 'picocolors'

// Add client option
interface ListArgv {
  client?: string
}

export const command = 'list'
export const describe = 'List all configured MCP servers'
export const aliases = ['ls']

export function builder(yargs: Argv): Argv<ListArgv> {
  return yargs.option('client', {
    type: 'string',
    description: 'MCP client to list servers from',
    alias: 'c',
    choices: getAvailableClients(),
    default: 'claude',
  })
}

export async function handler(argv: ArgumentsCamelCase<ListArgv>) {
  try {
    const clientName = argv.client as string

    // Verify client is supported
    if (!clientPaths[clientName]) {
      logger.error(red(`Client "${clientName}" is not supported.`))
      logger.info(yellow(`Supported clients: ${getAvailableClients().join(', ')}`))
      return
    }

    // Read config
    const config = await readClientConfig(clientName)

    if (!config.mcpServers || Object.keys(config.mcpServers).length === 0) {
      logger.info(yellow(`No MCP servers configured for ${clientName}`))
      logger.info('Use the install command to add a new MCP server:')
      logger.info(gray(`  mcps install <package-name> --client ${clientName}`))
      return
    }

    logger.info(bold(green(`Configured MCP Servers for ${clientName}:\n`)))

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
