# MCP Bar

The CLI manager for MCP servers.

## 🌟 Features

- 🔄 Simple installation and management of MCP servers
- 🛠️ User-friendly command-line interface with interactive prompts for easy configuration
- 📱 Works cross platform
- 🔍 Search, install, disable, and enable MCP servers with ease

## 📦 Installation

```sh
npm install -g mcpbar
```

## 🔧 Usage

### Basic Commands

```sh
# 🔍 Install a server
mcpbar install playwright # install playwright server

# 🗑️ Remove a server
mcpbar remove playwright # remove playwright server

# 📋 List installed servers
mcpbar list # show existing mcp servers installed on the device
```

### Search for MCP Servers

Search for available MCP packages in the registry:

```bash
mcpbar search                # Interactive search mode
mcpbar search <query>        # Search with a specific query
```

### Install a MCP Server

Install a MCP package by its name:

```bash
mcpbar install <name>   # Install a specific package
mcpbar i <name>         # Short alias for install
```

### Remove a MCP Server

Remove a MCP server:

```bash
mcpbar remove <name>         # Remove a specific server
mcpbar rm <name>             # Short alias for remove
```

### List MCP Servers

View all your configured MCP servers:

```bash
mcpbar list
# Or use the short alias
mcpbar ls
```

### Start an MCP Server

Run a MCP server on standalone mode.

```bash
mcpbar start <name>
# Or use the alias
mcpbar s <name>
```

## 📋 Example Workflow

```bash
# Search for available servers
mcpbar search playwright

# Install the server you want
mcpbar install playwright

# Verify installation
mcpbar list
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
