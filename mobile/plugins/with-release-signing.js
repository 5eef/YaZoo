const { withAppBuildGradle } = require('expo/config-plugins');

const guard = `
// YAZOO_RELEASE_SIGNING_START
def yazooSigningMode = System.getenv('YAZOO_SIGNING_MODE') ?: 'production'
def yazooProfile = System.getenv('EAS_BUILD_PROFILE') ?: ''
def yazooEasBuild = System.getenv('EAS_BUILD') == 'true'
def yazooUploadNames = ['YAZOO_UPLOAD_STORE_FILE', 'YAZOO_UPLOAD_STORE_PASSWORD', 'YAZOO_UPLOAD_KEY_ALIAS', 'YAZOO_UPLOAD_KEY_PASSWORD']
def yazooUploadValues = yazooUploadNames.collect { System.getenv(it) }
if (yazooUploadValues.every { it }) {
    android.signingConfigs.create('yazooUpload') {
        storeFile file(yazooUploadValues[0])
        storePassword yazooUploadValues[1]
        keyAlias yazooUploadValues[2]
        keyPassword yazooUploadValues[3]
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.yazooUpload
}
gradle.taskGraph.whenReady { taskGraph ->
    def releaseRequested = taskGraph.allTasks.any { it.name.toLowerCase().contains('release') }
    if (releaseRequested) {
        if (!(yazooSigningMode in ['production', 'validation'])) {
            throw new GradleException('Unknown YAZOO_SIGNING_MODE; use production or explicit unsigned validation.')
        }
        if (yazooSigningMode == 'validation') {
            if (yazooEasBuild || yazooProfile in ['production', 'preview']) {
                throw new GradleException('Unsigned validation is forbidden for distributed/EAS builds.')
            }
            android.buildTypes.release.signingConfig = null
        } else {
            def selected = android.buildTypes.release.signingConfig
            if (selected == null || selected == android.signingConfigs.debug || selected.keyAlias == 'androiddebugkey' || selected.storePassword == 'android' || selected.keyPassword == 'android' || selected.storeFile == null || !selected.storeFile.exists()) {
                throw new GradleException('YaZoo production release requires real upload signing credentials. Configure EAS remote credentials or all YAZOO_UPLOAD_* variables; debug fallback is forbidden.')
            }
            def api = System.getenv('EXPO_PUBLIC_API_URL') ?: ''
            def apiUri
            try { apiUri = new URI(api) } catch (Exception ignored) { throw new GradleException('Production release requires a valid HTTPS EXPO_PUBLIC_API_URL.') }
            def apiHost = apiUri.host?.toLowerCase()
            if (apiUri.scheme != 'https' || !apiHost || apiUri.userInfo || apiUri.query || apiUri.fragment || apiHost == 'localhost' || apiHost ==~ /[0-9.]+/ || apiHost.contains(':') || apiHost ==~ /.*\\.(test|invalid|example|localhost)/ || apiHost ==~ /(^|.*\\.)example\\.(com|org|net)/) {
                throw new GradleException('Production release requires a real public HTTPS EXPO_PUBLIC_API_URL without credentials, query or fragment.')
            }
        }
    }
}
// YAZOO_RELEASE_SIGNING_END
`;

function applySigningGuard(contents) {
  if (contents.includes('// YAZOO_RELEASE_SIGNING_START')) {
    return contents.replace(/\n\/\/ YAZOO_RELEASE_SIGNING_START[\s\S]*?\/\/ YAZOO_RELEASE_SIGNING_END\n?/, guard);
  }
  const marker = /release\s*\{([\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!marker.test(contents)) throw new Error('Unexpected Expo Gradle release template: review signing configuration.');
  return contents.replace(marker, 'release {$1signingConfig null') + guard;
}
module.exports = config => withAppBuildGradle(config, mod => {
  if (mod.modResults.language !== 'groovy') throw new Error('YaZoo signing plugin requires the reviewed Groovy template.');
  mod.modResults.contents = applySigningGuard(mod.modResults.contents);
  return mod;
});
module.exports.applySigningGuard = applySigningGuard;
