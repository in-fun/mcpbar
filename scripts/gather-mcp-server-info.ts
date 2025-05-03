/**
 * Module to gather information about MCP servers from GitHub repositories
 * This helps automate the process of adding MCP servers to mcp registry
 */

// Types for fetch API
type HeadersInit = Headers | Record<string, string> | string[][]

interface RepoInfo {
  name: string
  description: string
  owner: {
    login: string
  }
  homepage?: string
  licenseInfo?: {
    spdxId: string
  }
  repositoryTopics?: {
    nodes: {
      topic: {
        name: string
      }
    }[]
  }
}

interface PackageInfo {
  name?: string
  description?: string
  version?: string
}

interface EnvVar {
  name: string
  description: string
  required: boolean
}

interface MCPServerConfig {
  command: string
  args: string[]
  env: Record<string, string>
  timeout?: number
}

interface MCPInput {
  id: string
  type: string
  description: string
  password?: boolean
}

interface MCPManifest {
  name: string
  version: string
  description: string
  homepage: string
  repository?: {
    type: string
    url: string
  }
  license: string
  keywords?: string[]
  inputs?: MCPInput[]
  server: MCPServerConfig
}

interface GitHubGraphQLResponse {
  data: {
    repository: RepoInfo
  }
}

/**
 * Check if a package is published on npm
 */
async function checkNpmPackage(packageName: string): Promise<{ published: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`)
    if (response.status === 404) {
      return { published: false, error: 'Package not found' }
    }
    const data = await response.json()
    return { published: true, data }
  } catch (error) {
    return { published: false, error: (error as Error).message }
  }
}

/**
 * Check if a package is published on PyPI
 */
async function checkPyPiPackage(packageName: string): Promise<{ published: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`https://pypi.org/pypi/${packageName}/json`)
    if (!response.ok) {
      return { published: false, error: `Status: ${response.status}` }
    }
    const data = await response.json()
    return { published: true, data }
  } catch (error) {
    return { published: false, error: (error as Error).message }
  }
}

/**
 * Extract all JSON code blocks from README content
 */
function extractJsonCodeBlocks(readmeContent: string): string[] {
  const jsonBlocks: string[] = []

  // Match all JSON code blocks with ```json or ``` pattern
  const codeBlocksRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/g
  let match
  while ((match = codeBlocksRegex.exec(readmeContent)) !== null) {
    if (match[1]) {
      try {
        // Clean up and try to parse it to make sure it's valid JSON
        const cleanJson = match[1].replace(/\\n/g, '').trim()
        JSON.parse(cleanJson)
        jsonBlocks.push(cleanJson)
      } catch (e) {
        // Ignore invalid JSON blocks
        console.debug('Found invalid JSON block in README')
      }
    }
  }

  return jsonBlocks
}

/**
 * Extract MCP server configuration from JSON code blocks
 */
function extractMCPConfigFromJsonBlocks(jsonBlocks: string[]): MCPServerConfig | null {
  // Track candidates by priority
  let mcpServerCandidate: MCPServerConfig | null = null
  let serverCandidate: MCPServerConfig | null = null
  let mcpServersCandidate: MCPServerConfig | null = null
  let directServerCandidate: MCPServerConfig | null = null
  let manifestServerCandidate: MCPServerConfig | null = null

  for (const jsonBlock of jsonBlocks) {
    try {
      const parsed = JSON.parse(jsonBlock)

      // Check for mcp object pattern (highest priority)
      if (!mcpServerCandidate && parsed.mcp && typeof parsed.mcp === 'object') {
        if (parsed.mcp.servers && typeof parsed.mcp.servers === 'object') {
          // Get the first server entry
          const serverName = Object.keys(parsed.mcp.servers)[0]
          if (serverName && parsed.mcp.servers[serverName]) {
            const serverConfig = parsed.mcp.servers[serverName]
            if (serverConfig.command && serverConfig.args && serverConfig.env) {
              mcpServerCandidate = serverConfig as MCPServerConfig
            }
          }
        }
      }

      // Check for servers pattern (second priority)
      if (!serverCandidate && parsed.servers && typeof parsed.servers === 'object') {
        // Get the first server entry
        const serverName = Object.keys(parsed.servers)[0]
        if (serverName && parsed.servers[serverName]) {
          const serverConfig = parsed.servers[serverName]
          if (serverConfig.command && serverConfig.args && serverConfig.env) {
            serverCandidate = serverConfig as MCPServerConfig
          }
        }
      }

      // Check for mcpServers pattern (third priority)
      if (!mcpServersCandidate && parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        // Get the first mcpServer entry
        const serverName = Object.keys(parsed.mcpServers)[0]
        if (serverName && parsed.mcpServers[serverName]) {
          const serverConfig = parsed.mcpServers[serverName]
          if (serverConfig.command && serverConfig.args && serverConfig.env) {
            mcpServersCandidate = serverConfig as MCPServerConfig
          }
        }
      }

      // Check for server direct object pattern (fourth priority)
      if (!directServerCandidate && parsed.command && parsed.args && parsed.env) {
        directServerCandidate = parsed as MCPServerConfig
      }

      // Check for MCP manifest pattern with server property (lowest priority)
      if (!manifestServerCandidate && parsed.server && typeof parsed.server === 'object') {
        const serverConfig = parsed.server
        if (serverConfig.command && serverConfig.args && serverConfig.env) {
          manifestServerCandidate = serverConfig as MCPServerConfig
        }
      }
    } catch (e) {
      // Skip invalid JSON
      console.debug('Error parsing JSON block:', e)
    }
  }

  // Return the highest priority candidate that exists
  if (mcpServerCandidate) {
    console.debug('Using server config from mcp.servers')
    return mcpServerCandidate
  }

  if (serverCandidate) {
    console.debug('Using server config from servers')
    return serverCandidate
  }

  if (mcpServersCandidate) {
    console.debug('Using server config from mcpServers')
    return mcpServersCandidate
  }

  if (directServerCandidate) {
    console.debug('Using direct server config')
    return directServerCandidate
  }

  if (manifestServerCandidate) {
    console.debug('Using server config from manifest')
    return manifestServerCandidate
  }

  return null
}

/**
 * Extract MCP inputs from JSON code blocks
 */
function extractMCPInputsFromJsonBlocks(jsonBlocks: string[]): MCPInput[] {
  // Track candidates by priority
  let mcpInputsCandidate: MCPInput[] | null = null
  let directInputsCandidate: MCPInput[] | null = null
  let manifestInputsCandidate: MCPInput[] | null = null

  for (const jsonBlock of jsonBlocks) {
    try {
      const parsed = JSON.parse(jsonBlock)

      // Check for mcp object pattern (highest priority)
      if (!mcpInputsCandidate && parsed.mcp && typeof parsed.mcp === 'object') {
        if (Array.isArray(parsed.mcp.inputs) && parsed.mcp.inputs.length > 0) {
          // Validate that it has the expected properties
          if (parsed.mcp.inputs[0].id && parsed.mcp.inputs[0].type && parsed.mcp.inputs[0].description) {
            mcpInputsCandidate = parsed.mcp.inputs as MCPInput[]
          }
        }
      }

      // Check for direct inputs array (second priority)
      if (!directInputsCandidate && Array.isArray(parsed.inputs) && parsed.inputs.length > 0) {
        // Validate that it has the expected properties
        if (parsed.inputs[0].id && parsed.inputs[0].type && parsed.inputs[0].description) {
          directInputsCandidate = parsed.inputs as MCPInput[]
        }
      }

      // Check for inputs within an MCP manifest (lowest priority)
      if (
        !manifestInputsCandidate &&
        parsed.name &&
        parsed.version &&
        Array.isArray(parsed.inputs) &&
        parsed.inputs.length > 0
      ) {
        if (parsed.inputs[0].id && parsed.inputs[0].type && parsed.inputs[0].description) {
          manifestInputsCandidate = parsed.inputs as MCPInput[]
        }
      }
    } catch (e) {
      // Skip invalid JSON
      console.debug('Error parsing JSON block for inputs:', e)
    }
  }

  // Return the highest priority candidate that exists
  if (mcpInputsCandidate) {
    console.debug('Using inputs from mcp.inputs')
    return mcpInputsCandidate
  }

  if (directInputsCandidate) {
    console.debug('Using direct inputs array')
    return directInputsCandidate
  }

  if (manifestInputsCandidate) {
    console.debug('Using inputs from manifest')
    return manifestInputsCandidate
  }

  return []
}

/**
 * Extract MCP server configuration from README content
 */
function extractMCPConfigFromReadme(readmeContent: string): MCPServerConfig | null {
  // Extract all JSON code blocks
  const jsonBlocks = extractJsonCodeBlocks(readmeContent)

  // Try to find MCP server config in the JSON blocks
  return extractMCPConfigFromJsonBlocks(jsonBlocks)
}

/**
 * Extract MCP inputs from README content
 */
function extractMCPInputsFromReadme(readmeContent: string): MCPInput[] {
  // Extract all JSON code blocks
  const jsonBlocks = extractJsonCodeBlocks(readmeContent)

  // Try to find MCP inputs in the JSON blocks
  return extractMCPInputsFromJsonBlocks(jsonBlocks)
}

/**
 * Extract environment variables from MCPServerConfig
 */
function extractEnvVarsFromConfig(config: MCPServerConfig): EnvVar[] {
  const envVars: EnvVar[] = []

  if (config && config.env) {
    // Extract environment variables from the env object
    for (const [key, value] of Object.entries(config.env)) {
      const isRequired = !value.includes('?') && !value.includes('optional')
      const description = getEnvVarDescription(key, value)

      envVars.push({
        name: key,
        description,
        required: isRequired,
      })
    }
  }

  return envVars
}

/**
 * Generate description for environment variable
 */
function getEnvVarDescription(key: string, value: string): string {
  // Extract description from value or generate one based on key
  if (value.includes('description:')) {
    const descMatch = value.match(/description:\s*["']([^"']+)["']/)
    if (descMatch && descMatch[1]) {
      return descMatch[1]
    }
  }

  // Generate description based on the variable name
  const nameParts = key.toLowerCase().split('_')
  const resource =
    nameParts.includes('key') ||
    nameParts.includes('token') ||
    nameParts.includes('secret') ||
    nameParts.includes('password')
      ? 'authentication'
      : 'configuration'

  return `Environment variable for ${key.toLowerCase().replace(/_/g, ' ')} ${resource}`
}

/**
 * Fallback method to extract environment variables from README content
 * Used only when no MCPServerConfig is found
 */
function extractEnvVarsFromReadme(readmeContent: string): EnvVar[] {
  const envVars: EnvVar[] = []

  // Look for common environment variable patterns
  const envVarMatches = readmeContent.match(/[A-Z_]{2,}(_KEY|_TOKEN|_SECRET|_API|_URL|_HOST|_PORT|_USER|_PASS|_DB)/g)

  if (envVarMatches) {
    const uniqueEnvVars = [...new Set(envVarMatches)]
    uniqueEnvVars.forEach((varName) => {
      envVars.push({
        name: varName,
        description: `Environment variable for ${varName.toLowerCase().replace(/_/g, ' ')}`,
        required: true,
      })
    })
  }

  return envVars
}

/**
 * Get repository information using GitHub's GraphQL API
 */
async function getRepoInfo(owner: string, repo: string, token: string | undefined): Promise<RepoInfo> {
  const query = `
    query {
      repository(owner: "${owner}", name: "${repo}") {
        name
        description
        owner {
          login
        }
        homepage: homepageUrl
        licenseInfo {
          spdxId
        }
        repositoryTopics(first: 10) {
          nodes {
            topic {
              name
            }
          }
        }
      }
    }
  `

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  const result = (await response.json()) as GitHubGraphQLResponse
  return result.data.repository
}

/**
 * Get file content from GitHub's REST API
 */
async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  token: string | undefined,
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3.raw',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, { headers })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } catch (error) {
    console.error(`Error fetching ${path}:`, error)
    return null
  }
}

/**
 * Get README content from GitHub's REST API without requiring specific filename
 */
async function getReadmeContent(owner: string, repo: string, token: string | undefined): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3.raw',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, { headers })

    if (response.status === 404) {
      console.log('No README found in the repository')
      return null
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } catch (error) {
    console.error('Error fetching README:', error)

    // Fallback to common README filenames if the API call fails
    const commonReadmeFiles = ['README.md', 'Readme.md', 'readme.md', 'README.markdown', 'README.txt', 'README']

    for (const filename of commonReadmeFiles) {
      console.log(`Trying to fetch ${filename}...`)
      const content = await getFileContent(owner, repo, filename, token)
      if (content) {
        console.log(`Found README at ${filename}`)
        return content
      }
    }

    return null
  }
}

/**
 * Extract GitHub information and create an MCP manifest
 */
export async function extractGitHubInfo(repoUrl: string, githubToken?: string): Promise<MCPManifest | null> {
  const urlParts = repoUrl.split('/')
  if (urlParts.length < 5) {
    throw new Error('Invalid GitHub repository URL')
  }

  const owner = urlParts[3]
  const repo = urlParts[4]

  if (!owner || !repo) {
    throw new Error('Invalid GitHub repository URL format')
  }

  try {
    // Get repository information
    const repoInfo = await getRepoInfo(owner, repo, githubToken)

    // Get package.json content
    let packageInfo: PackageInfo = {}
    let runtime: string | null = null
    let packageName: string | null = null

    const packageJsonContent = await getFileContent(owner, repo, 'package.json', githubToken)

    if (packageJsonContent) {
      packageInfo = JSON.parse(packageJsonContent)
      runtime = 'node'
      packageName = packageInfo.name || null
    } else {
      const pyprojectContent = await getFileContent(owner, repo, 'pyproject.toml', githubToken)

      if (pyprojectContent) {
        const nameMatch = pyprojectContent.match(/name\s*=\s*["']([^"']+)["']/)
        if (nameMatch && nameMatch[1]) {
          packageName = nameMatch[1]
          runtime = 'python'
        }
      }
    }

    // Get README content using the dedicated method
    const readmeContent = await getReadmeContent(owner, repo, githubToken)
    if (!readmeContent) {
      console.error('No README found in the repository')
      return null
    }

    // Get license information
    const license = repoInfo.licenseInfo?.spdxId || 'Unknown'

    // Extract keywords from repository topics
    const topics: string[] = []
    if (repoInfo.repositoryTopics?.nodes) {
      topics.push(...repoInfo.repositoryTopics.nodes.map((node) => node.topic.name))
    }

    // Add default keywords if no topics found
    if (topics.length === 0) {
      topics.push('mcp', 'model-context-protocol')
      topics.push(repo.toLowerCase(), owner.toLowerCase())
    } else {
      // Add mcp and model-context-protocol if not already in topics
      if (!topics.includes('mcp')) {
        topics.push('mcp')
      }
      if (!topics.includes('model-context-protocol')) {
        topics.push('model-context-protocol')
      }
    }

    // Check package publish status
    let publishStatus = { published: false }
    if (packageName) {
      if (runtime === 'node') {
        publishStatus = await checkNpmPackage(packageName)
      } else if (runtime === 'python') {
        publishStatus = await checkPyPiPackage(packageName)
      }
    }

    if (!publishStatus.published) {
      console.log(`Package ${packageName} is not published on ${runtime === 'node' ? 'npm' : 'PyPI'}`)
      return null
    }

    // Extract server config, inputs, and environment variables
    let serverConfig: MCPServerConfig | null = null
    let mcpInputs: MCPInput[] = []
    let envVars: EnvVar[] = []

    // First try to extract MCP server config
    serverConfig = extractMCPConfigFromReadme(readmeContent)

    if (serverConfig) {
      console.log('Found MCP server config in README')
      // If we found a server config, extract env vars from it
      envVars = extractEnvVarsFromConfig(serverConfig)
    } else {
      console.log('No MCP server config found in README, falling back to extracting env vars from README')
      // Fallback to extracting env vars from README
      envVars = extractEnvVarsFromReadme(readmeContent)

      // Create a basic server config if none was found
      const defaultArgs: string[] = []
      if (runtime === 'node') {
        defaultArgs.push('-y')
        if (packageName) defaultArgs.push(packageName)
        else defaultArgs.push(repo)
      } else {
        if (packageName) defaultArgs.push(packageName)
        else defaultArgs.push(repo)
      }

      serverConfig = {
        command: runtime === 'node' ? 'npx' : 'uvx',
        args: defaultArgs,
        env: envVars.reduce(
          (acc, envVar) => {
            acc[envVar.name] = `\${input:${envVar.name.toLowerCase()}}`
            return acc
          },
          {} as Record<string, string>,
        ),
      }
    }

    // Try to extract MCP inputs
    mcpInputs = extractMCPInputsFromReadme(readmeContent)

    // If no inputs were found but we have env vars, create inputs from env vars
    if (mcpInputs.length === 0 && envVars.length > 0) {
      mcpInputs = envVars.map((envVar) => ({
        id: envVar.name.toLowerCase(),
        type: 'promptString',
        description: envVar.description,
        password: envVar.name.includes('KEY') || envVar.name.includes('TOKEN') || envVar.name.includes('SECRET'),
      }))
    }

    // Create MCP manifest
    const manifest: MCPManifest = {
      name: packageName || repo,
      version: packageInfo.version || '1.0.0',
      description: packageInfo.description || repoInfo.description || `MCP server for ${repo}`,
      homepage: repoInfo.homepage || repoUrl,
      repository: {
        type: 'git',
        url: repoUrl,
      },
      license,
      keywords: topics,
      inputs: mcpInputs,
      server: serverConfig,
    }

    return manifest
  } catch (error) {
    console.error('Error gathering information:', error)
    return null
  }
}
