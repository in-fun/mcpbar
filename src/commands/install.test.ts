import { handler } from './install'
import { downloadManifest } from '../packages'
import { readClientConfig } from '../config'
import { logger } from '../logger'
import { ArgumentsCamelCase } from 'yargs'

// Create an interface matching the structure of yargs arguments object
interface InstallArgv {
  source: string
  name?: string
  client?: string
}

// Mock dependencies
jest.mock('../packages', () => ({
  downloadManifest: jest.fn(),
}))

jest.mock('../config', () => ({
  readClientConfig: jest.fn(),
  writeClientConfig: jest.fn(),
  getAvailableClients: jest.fn().mockReturnValue(['claude']),
  clientPaths: { claude: '/path/to/claude/config' },
  createPlatformCommand: jest.fn().mockImplementation((command, args) => ({ command, args })),
}))

jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    prompt: jest.fn(),
  },
}))

// Create a helper function to generate a properly typed yargs args object
function createMockArgs(args: Partial<InstallArgv>): ArgumentsCamelCase<InstallArgv> {
  return {
    ...args,
    _: [],
    $0: 'mcpbar',
  } as ArgumentsCamelCase<InstallArgv>
}

describe('Install Command', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Set up default mock returns
    const mockClientConfig = { mcpServers: {} }
    ;(readClientConfig as jest.Mock).mockResolvedValue(mockClientConfig)

    // Setup for downloadManifest
    ;(downloadManifest as jest.Mock).mockResolvedValue({
      name: 'test-server',
      description: 'Test server description',
      manifest: {
        name: 'test-server',
        inputs: [],
        server: {
          command: 'echo',
          args: ['hello'],
          env: {},
        },
      },
      buildConfig: jest.fn().mockReturnValue({
        command: 'echo',
        args: ['hello'],
        env: {},
      }),
    })

    // Setup for prompt
    ;(logger.prompt as jest.Mock).mockResolvedValue(true)
  })

  it('should transform package alias to registry URL', async () => {
    // Call the handler with an alias
    await handler(
      createMockArgs({
        source: 'vendor/package-name',
        client: 'claude',
      }),
    )

    // Check if downloadManifest was called with the transformed URL
    expect(downloadManifest).toHaveBeenCalledWith('https://esm.sh/gh/in-fun/mcpbar/registry/vendor/package-name.json')
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Using package alias'))
  })

  it('should not transform URLs with protocols', async () => {
    // Call the handler with a URL
    await handler(
      createMockArgs({
        source: 'https://example.com/manifest.json',
        client: 'claude',
      }),
    )

    // Should pass through the URL unchanged
    expect(downloadManifest).toHaveBeenCalledWith('https://example.com/manifest.json')
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Using package alias'))
  })

  it('should not transform absolute file paths', async () => {
    // Call the handler with an absolute path
    await handler(
      createMockArgs({
        source: '/path/to/manifest.json',
        client: 'claude',
      }),
    )

    // Should pass through the path unchanged
    expect(downloadManifest).toHaveBeenCalledWith('/path/to/manifest.json')
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Using package alias'))
  })

  it('should not transform relative file paths', async () => {
    // Call the handler with a relative path
    await handler(
      createMockArgs({
        source: './manifests/package.json',
        client: 'claude',
      }),
    )

    // Should pass through the path unchanged
    expect(downloadManifest).toHaveBeenCalledWith('./manifests/package.json')
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Using package alias'))
  })

  it('should handle file:// protocol', async () => {
    // Call the handler with file protocol
    await handler(
      createMockArgs({
        source: 'file:///path/to/manifest.json',
        client: 'claude',
      }),
    )

    // Should pass through the URL unchanged
    expect(downloadManifest).toHaveBeenCalledWith('file:///path/to/manifest.json')
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Using package alias'))
  })

  it('should handle other protocols', async () => {
    // Call the handler with data protocol
    await handler(
      createMockArgs({
        source: 'data:application/json;base64,ewogICJuYW1lIjogInRlc3Qtc2VydmVyIgp9',
        client: 'claude',
      }),
    )

    // Should pass through the URL unchanged
    expect(downloadManifest).toHaveBeenCalledWith('data:application/json;base64,ewogICJuYW1lIjogInRlc3Qtc2VydmVyIgp9')
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Using package alias'))
  })
})
