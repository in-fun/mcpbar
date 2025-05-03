import { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { bold, gray, blue } from 'picocolors'
import open from 'open'

interface SearchArgv {
  query?: string[]
}

export const command = 'search [query..]'
export const describe = 'Search for MCP servers on mcp.bar'
export const aliases = ['s']

export function builder(yargs: Argv): Argv<SearchArgv> {
  return yargs.positional('query', {
    type: 'string',
    array: true,
    description: 'Search terms to find MCP servers',
  })
}

export async function handler(argv: ArgumentsCamelCase<SearchArgv>) {
  try {
    const queryTerms = (argv.query as string[]) || []
    const searchQuery = queryTerms.join(' ')
    const searchUrl = searchQuery ? `https://www.mcp.bar/?q=${encodeURIComponent(searchQuery)}` : 'https://www.mcp.bar/'

    logger.info(bold(`Opening browser to search for MCP servers${searchQuery ? ` matching "${searchQuery}"` : ''}...`))

    // Open the URL in the default browser
    await open(searchUrl)

    logger.info(gray("If your browser doesn't open automatically, visit:"))
    logger.info(blue(searchUrl))
  } catch (error: any) {
    logger.error(`Failed to perform search: ${error.message}`)
  }
}
