import { downloadManifest } from './packages'
import path from 'path'

describe('Packages', () => {
  it('should load a manifest from file path', async () => {
    // Use the local github.json manifest file
    const manifestPath = path.join(process.cwd(), 'manifests', 'github.json')

    const server = await downloadManifest(manifestPath)

    expect(server).not.toBeNull()
    if (server) {
      expect(server.name).toBe('github')
      expect(server.manifest.inputs.length).toBeGreaterThan(0)
      expect(server.manifest.server.command).toBe('docker')
    }
  })

  it('should handle URL manifest sources', async () => {
    // Mock fetch for URL testing
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
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
            }),
          ),
      }),
    ) as jest.Mock

    const server = await downloadManifest('https://example.com/test-server.json')

    expect(server).not.toBeNull()
    if (server) {
      expect(server.name).toBe('test-vendor')
      expect(server.description).toBe('Test MCP server')
    }
  })
})
