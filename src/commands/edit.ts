import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { getAvailableClients, clientPaths } from '../config'
import { bold, green, red, yellow } from 'picocolors'
import open from 'open'

interface EditArgv {
  client?: string
}

export const command = 'edit'
export const describe = 'Open the MCP client configuration file for editing'
export const aliases = ['e']

export function builder(yargs: Argv): Argv<EditArgv> {
  return yargs.option('client', {
    type: 'string',
    description: 'MCP client configuration to edit',
    alias: 'c',
    choices: getAvailableClients(),
    default: 'claude',
  })
}

export async function handler(argv: ArgumentsCamelCase<EditArgv>) {
  try {
    const clientName = argv.client as string
    const configFile = clientPaths[clientName]

    // Verify client is supported
    if (!configFile) {
      logger.error(red(`Client "${clientName}" is not supported.`))
      logger.info(yellow(`Supported clients: ${getAvailableClients().join(', ')}`))
      return
    }

    logger.info(bold(green(`Configuration file for ${clientName}:`)))
    logger.info(configFile)

    // Open the file with the default system editor
    try {
      await open(configFile)
    } catch (error: any) {
      logger.error(`Failed to open the configuration file: ${error.message}`)
      logger.info(yellow(`You can open the file manually at the path shown above.`))
    }
  } catch (error: any) {
    logger.error(`Failed to edit MCP client configuration: ${error.message}`)
  }
}
