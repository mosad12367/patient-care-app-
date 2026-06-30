const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Monorepo: watch root node_modules too
const monorepoRoot = path.resolve(__dirname, '../..')
config.watchFolders = [monorepoRoot]

// Stub out Node-only packages that don't exist on web/native
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@opentelemetry/api') {
    return { type: 'empty' }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
