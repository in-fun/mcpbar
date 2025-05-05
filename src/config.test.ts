import { createPlatformCommand } from './config'

describe('createPlatformCommand', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    })
  })

  it('returns command and args unchanged on non-Windows platforms', () => {
    // Test for Unix-like platforms
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    const command = 'npx'
    const args = ['-y', 'package-name']
    const result = createPlatformCommand(command, args)

    expect(result).toEqual({
      command: 'npx',
      args: ['-y', 'package-name'],
    })
  })

  it('wraps command in cmd /c on Windows', () => {
    // Mock Windows platform
    Object.defineProperty(process, 'platform', { value: 'win32' })

    const command = 'npx'
    const args = ['-y', 'package-name']
    const result = createPlatformCommand(command, args)

    expect(result).toEqual({
      command: 'cmd',
      args: ['/c', 'npx', '-y', 'package-name'],
    })
  })

  it('correctly handles Docker commands on non-Windows platforms', () => {
    // Test for Unix-like platforms
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const command = 'docker'
    const args = ['run', '-i', '--rm', 'image-name']
    const result = createPlatformCommand(command, args)

    expect(result).toEqual({
      command: 'docker',
      args: ['run', '-i', '--rm', 'image-name'],
    })
  })

  it('correctly handles Docker commands on Windows', () => {
    // Mock Windows platform
    Object.defineProperty(process, 'platform', { value: 'win32' })

    const command = 'docker'
    const args = ['run', '-i', '--rm', 'image-name']
    const result = createPlatformCommand(command, args)

    expect(result).toEqual({
      command: 'cmd',
      args: ['/c', 'docker', 'run', '-i', '--rm', 'image-name'],
    })
  })
})
