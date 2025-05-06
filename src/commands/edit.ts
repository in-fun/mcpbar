import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { getAvailableClients, clientPaths } from '../config'
import { bold, green, red, yellow } from 'picocolors'
import open from 'open'
import fs from 'fs/promises'
import path from 'node:path'

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

    // Check if the config file exists
    let fileExists = false
    try {
      await fs.access(configFile)
      fileExists = true
    } catch (err) {
      // File doesn't exist
      fileExists = false
    }

    if (!fileExists) {
      logger.info(yellow(`Configuration file for ${clientName} does not exist at:`))
      logger.info(configFile)

      const shouldCreate = await logger.prompt(
        `Would you like to create an empty configuration file for ${clientName}?`,
        { type: 'confirm', default: true },
      )

      if (shouldCreate) {
        // Create directory if it doesn't exist
        await fs.mkdir(path.dirname(configFile), { recursive: true })

        // Create empty config file
        await fs.writeFile(configFile, '', 'utf-8')

        logger.success(green(`Created empty configuration file for ${clientName} at:`))
        logger.info(configFile)
      } else {
        logger.info(yellow('Configuration file creation skipped.'))
        return
      }
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
