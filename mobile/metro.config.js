const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// CNG/Gradle output is not application JavaScript. Avoid indexing native build
// trees and repeated invalidations while compiling Android alongside Metro.
const generated = /[\\/]android[\\/](?:.*[\\/])?(?:build|\.cxx|\.gradle)[\\/].*/;
const existing = config.resolver.blockList;
const root = __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exported = new RegExp(`^${root}[\\\\/](?:dist|coverage)[\\\\/]`);
config.resolver.blockList = [...(Array.isArray(existing) ? existing : existing ? [existing] : []), generated, exported];
module.exports = config;
