import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { readClientConfig, writeClientConfig, getAvailableClients, clientPaths, createPlatformCommand } from '../config'
import { green, red, yellow } from 'picocolors'
import { downloadManifest } from '../packages'
import { McpServerInput } from '../types'

interface InstallArgv {
  source: string
  name?: string
  client?: string
}

export const command = 'install <source>'
export const describe = 'Install and configure an MCP server from a URL or file path'
export const aliases = ['i']

export function builder(yargs: Argv): Argv<InstallArgv> {
  return yargs
    .positional('source', {
      type: 'string',
      description: 'URL, file path, or package alias for the MCP server manifest',
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
    const manifestSource = argv.source as string
    const clientName = argv.client as string

    // Verify client is supported
    if (!clientPaths[clientName]) {
      logger.error(red(`Client "${clientName}" is not supported.`))
      logger.info(yellow(`Supported clients: ${getAvailableClients().join(', ')}`))
      return
    }

    // Transform source if it's an alias (not a file path or URL)
    let source = manifestSource
    if (!source.startsWith('./') && !source.startsWith('/') && !source.includes('://') && !source.startsWith('data:')) {
      // It's an alias, transform to registry URL
      source = `https://esm.sh/gh/in-fun/mcpbar/registry/${source}.json`
      logger.info(`Using package alias: ${manifestSource} → ${source}`)
    }

    // Download/load manifest from URL or file path
    const server = await downloadManifest(source)
    if (!server) {
      return // Error already logged in downloadManifest
    }

    // Use provided server name or use manifest name
    const serverName = argv.name || server.manifest.name

    // Collect inputs
    const inputs: Record<string, any> = {}
    for (const input of server.manifest.inputs) {
      await collectInput(input, inputs)
    }

    // Build config
    const rawConfig = server.buildConfig(inputs)

    // Apply platform-specific command adjustments
    const mcpConfig = {
      ...rawConfig,
      ...createPlatformCommand(rawConfig.command, rawConfig.args),
    }

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
