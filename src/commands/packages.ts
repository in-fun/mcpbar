import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { bold, gray, green } from 'picocolors'
import { packages, searchPackages } from '../packages'

interface PackagesArgv {
  search?: string
}

export const command = 'packages [search]'
export const describe = 'List available MCP packages'
export const aliases = ['pkg']

export function builder(yargs: Argv): Argv<PackagesArgv> {
  return yargs.positional('search', {
    type: 'string',
    description: 'Search term to filter packages',
  })
}

// Format package display
function formatPackage(name: string): string {
  const server = packages[name]
  if (!server) {
    return `Package ${name} not found`
  }

  const manifest = server.manifest

  return `${bold(green(server.name))} ${gray(`(${server.aliases.join(', ')})`)}\n
${manifest.description}\n
${gray('Version:')} ${manifest.version}
${gray('Vendor:')} ${manifest.vendor}
${gray('Protocol:')} ${manifest.protocol}
${manifest.license ? `${gray('License:')} ${manifest.license}\n` : ''}
${gray('Platforms:')} ${manifest.platforms ? manifest.platforms.join(', ') : 'Any'}\n
${gray('Inputs:')} ${manifest.inputs.length === 0 ? 'None' : ''}${manifest.inputs
    .map(
      (input) =>
        `\n  ${input.id}${input.required !== false ? '*' : ''}: ${input.description}${input.password ? ' (secure)' : ''}`,
    )
    .join('')}
`
}

export async function handler(argv: ArgumentsCamelCase<PackagesArgv>) {
  try {
    const searchTerm = argv.search as string | undefined
    const packageNames = await searchPackages(searchTerm || '')

    if (packageNames.length === 0) {
      logger.info(`No packages found matching "${searchTerm}"`)
      return
    }

    if (searchTerm) {
      logger.info(bold(`Packages matching "${searchTerm}":\n`))
    } else {
      logger.info(bold('Available MCP Packages:\n'))
    }

    packageNames.forEach((name) => {
      logger.info(formatPackage(name))
    })

    logger.info(gray('To install a package, use:'))
    logger.info('  mcps install <package-name>')
  } catch (error: any) {
    logger.error(`Failed to list packages: ${error.message}`)
  }
}
