import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { readClientConfig, writeClientConfig, getAvailableClients, clientPaths } from '../config'
import { green, red, yellow } from 'picocolors'
import { loadManifests, packages, searchPackages } from '../packages'
import { McpServerInput } from '../types'

interface InstallArgv {
  package: string
  name?: string
  client?: string
}

export const command = 'install <package>'
export const describe = 'Install and configure an MCP server'
export const aliases = ['i']

export function builder(yargs: Argv): Argv<InstallArgv> {
  return yargs
    .positional('package', {
      type: 'string',
      description: 'Package to install',
      demandOption: true,
    })
    .option('name', {
      type: 'string',
      description: 'Custom name for the MCP server',
      alias: 'n',
    })
    .option('client', {
      type: 'string',
      description: 'MCP client to install the server for',
      alias: 'c',
      choices: getAvailableClients(),
      default: 'claude',
    })
}

export async function handler(argv: ArgumentsCamelCase<InstallArgv>) {
  try {
    const packageName = argv.package as string
    const clientName = argv.client as string

    // Verify client is supported
    if (!clientPaths[clientName]) {
      logger.error(red(`Client "${clientName}" is not supported.`))
      logger.info(yellow(`Supported clients: ${getAvailableClients().join(', ')}`))
      return
    }

    await loadManifests()
    // Find package
    const server = packages[packageName]
    if (!server) {
      const suggestions = await searchPackages(packageName)
      if (suggestions.length > 0) {
        logger.error(red(`Package "${packageName}" not found.`))
        logger.info(yellow(`Did you mean: ${suggestions.join(', ')}?`))
      } else {
        logger.error(red(`Package "${packageName}" not found.`))
      }
      return
    }

    // Use provided server name or use package name
    const serverName = argv.name || packageName

    // Collect inputs
    const inputs: Record<string, any> = {}
    for (const input of server.manifest.inputs) {
      await collectInput(input, inputs)
    }

    // Build config
    const mcpConfig = server.buildConfig(inputs)

    // Update client config
    const config = await readClientConfig(clientName)

    if (!config.mcpServers) {
      config.mcpServers = {}
    }

    if (config.mcpServers[serverName]) {
      const replace = await logger.prompt(
        `An MCP server named "${serverName}" is already configured in ${clientName}. Do you want to replace it?`,
        { type: 'confirm', default: false },
      )

      if (!replace) {
        logger.info(yellow(`⚠️ Skipped replacing config for existing MCP server "${serverName}" in ${clientName}`))
        return
      }
    }

    config.mcpServers[serverName] = {
      command: mcpConfig.command,
      args: mcpConfig.args,
      env: mcpConfig.env,
    }

    // Write updated config
    await writeClientConfig(clientName, config)

    logger.success(green(`✅ Successfully installed ${server.name} as "${serverName}" for ${clientName}`))
  } catch (error: any) {
    logger.error(`Failed to install MCP server: ${error.message}`)
  }
}

/**
 * Collect input value from user
 */
async function collectInput(input: McpServerInput, inputs: Record<string, any>) {
  // Determine prompt type based on input type
  const promptType = input.type === 'promptBoolean' ? 'confirm' : 'text'
  const isPassword = !!input.password
  const isRequired = input.required !== false // Default to true if not specified

  // Prompt user for input
  const value = await logger.prompt(`${input.description}${isRequired ? ' (required)' : ''}:`, {
    type: promptType,
    password: isPassword,
    validate: (value: any) => {
      if (isRequired && (!value || (typeof value === 'string' && value.trim() === ''))) {
        return `${input.id} is required`
      }
      return true
    },
  })

  // Store the input value
  inputs[input.id] = value
}
