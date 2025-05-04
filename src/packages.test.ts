import { downloadManifest } from './packages'
import path from 'path'
import fs from 'fs/promises'

// Save the original fetch implementation before any mocks
const originalFetch = globalThis.fetch

// Mock for fetch
const mockFetch = (content: any) =>
  jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(content)),
    }),
  ) as jest.Mock

// Mock fs
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  stat: jest.fn().mockResolvedValue(true),
  readdir: jest.fn(),
}))

// Mock manifest content
const mockManifest = {
  name: 'test-server',
  vendor: 'test-vendor',
  description: 'Test MCP server',
  protocol: 'mcp',
  inputs: [],
  server: {
    command: 'echo',
    args: ['hello'],
    env: {},
  },
}

describe('Packages', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Only mock fetch for tests that need mocked fetch
    // Real fetch tests will override this themselves
    global.fetch = jest.fn() as jest.Mock
  })

  afterAll(() => {
    // Restore the original fetch when all tests are done
    global.fetch = originalFetch
  })

  it('should load a manifest from file path', async () => {
    // Mock the file read operation
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        name: 'github',
        description: 'GitHub MCP server',
        inputs: [{ id: 'token', description: 'GitHub token' }],
        server: {
          command: 'docker',
          args: ['run'],
          env: {},
        },
      }),
    )

    const manifestPath = path.join(process.cwd(), 'manifests', 'github.json')
    const server = await downloadManifest(manifestPath)

    expect(fs.readFile).toHaveBeenCalledWith(manifestPath, 'utf-8')
    expect(server).not.toBeNull()
    if (server) {
      expect(server.name).toBe('github')
      expect(server.manifest.inputs.length).toBeGreaterThan(0)
      expect(server.manifest.server.command).toBe('docker')
    }
  })

  it('should handle HTTP URL manifest sources', async () => {
    // Mock fetch for URL testing
    global.fetch = mockFetch(mockManifest)

    const server = await downloadManifest('https://example.com/test-server.json')

    expect(fetch).toHaveBeenCalledWith('https://example.com/test-server.json')
    expect(server).not.toBeNull()
    if (server) {
      expect(server.name).toBe('test-vendor')
      expect(server.description).toBe('Test MCP server')
    }
  })

  it('should handle file:// protocol manifest sources', async () => {
    // Mock fetch for file protocol testing
    global.fetch = mockFetch(mockManifest)

    const server = await downloadManifest('file:///path/to/manifest.json')

    expect(fetch).toHaveBeenCalledWith('file:///path/to/manifest.json')
    expect(server).not.toBeNull()
    if (server) {
      expect(server.name).toBe('test-vendor')
      expect(server.description).toBe('Test MCP server')
    }
  })

  it('should handle other protocol manifest sources', async () => {
    // Mock fetch for data protocol testing
    global.fetch = mockFetch(mockManifest)

    const server = await downloadManifest('data:application/json;base64,ewogICJuYW1lIjogInRlc3Qtc2VydmVyIgp9')

    expect(fetch).toHaveBeenCalledWith('data:application/json;base64,ewogICJuYW1lIjogInRlc3Qtc2VydmVyIgp9')
    expect(server).not.toBeNull()
    if (server) {
      expect(server.name).toBe('test-vendor')
      expect(server.description).toBe('Test MCP server')
    }
  })

  it('should handle real data URLs with actual fetch', async () => {
    // Create a real manifest
    const realManifest = {
      name: 'data-url-manifest',
      vendor: 'data-url-vendor',
      description: 'Data URL test with real fetch',
      protocol: 'mcp',
      inputs: [{ id: 'test-input', description: 'Test input' }],
      server: {
        command: 'echo',
        args: ['hello world'],
        env: { TEST_KEY: 'value' },
      },
    }

    // Convert to JSON and encode for data URL
    const jsonString = JSON.stringify(realManifest)
    const encodedJson = encodeURIComponent(jsonString)
    const dataUrl = `data:application/json,${encodedJson}`

    // Use real browser fetch (in Node.js environment this might not work)
    global.fetch = originalFetch

    // This should use the real fetch function with the data URL
    const server = await downloadManifest(dataUrl)

    // Check the result - this might fail in some environments
    console.log('Data URL test result:', server)

    // Basic check
    expect(server).not.toBeNull()

    // If we have a result, verify fields
    if (server) {
      expect(server.name).toBe('data-url-vendor')
      expect(server.description).toBe('Data URL test with real fetch')
      expect(server.manifest.inputs.length).toBe(1)
      expect(server.manifest.server.command).toBe('echo')
    }
  })

  it('should support data URLs with real fetch', async () => {
    // Create a simple inline manifest as a data URL
    const simpleManifest = {
      name: 'simple-data-url',
      description: 'Simple data URL test',
      server: {
        command: 'test',
        args: [],
        env: {},
      },
    }

    // Create a data URL with the manifest content
    const dataUrl = `data:application/json,${encodeURIComponent(JSON.stringify(simpleManifest))}`

    // Use the actual built-in fetch function
    global.fetch = originalFetch

    // Call downloadManifest with the data URL using the real fetch
    const server = await downloadManifest(dataUrl)

    // Verify the result
    expect(server).not.toBeNull()
    if (server) {
      expect(server.name).toBe('simple-data-url')
      expect(server.description).toBe('Simple data URL test')
    }
  })

  it('should handle failed fetch requests', async () => {
    // Mock fetch for failed request
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Not Found',
      }),
    ) as jest.Mock

    const server = await downloadManifest('https://example.com/not-found.json')

    expect(server).toBeNull()
  })
})
