import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8')

const deploy = read('.github/workflows/deploy.yml')
const dockerHubPublish = read('.github/workflows/dockerhub-publish.yml')
const ci = read('.github/workflows/ci.yml')
const codeql = read('.github/workflows/codeql.yml')
const startup = read('backend/startup.sh')
const setup = read('deploy/azure-setup.ps1')
const initialConfiguration = read('deploy/azure-dockerhub-deploy.ps1')
const workflowContents = [ci, deploy, dockerHubPublish, codeql]

const immutablePush = deploy.indexOf('name: Push immutable SHA images')
const imageSmoke = deploy.indexOf('name: Smoke-test immutable images before publication')
const bootstrapSecretValidation = deploy.indexOf('name: Validate guarded DB2 administrator bootstrap secrets')
const mysqlValidation = deploy.indexOf('name: Validate MySQL backup and restore readiness')
const migrationEnable = deploy.indexOf('"YAZOO_RUN_MIGRATIONS=true"')
const rollout = deploy.indexOf('name: Deploy exact SHA with one locked startup migration')
const latestPublish = deploy.indexOf('name: Publish last-known-good aliases')
const firstAzureImageChange = deploy.indexOf('az webapp config container set')

assert.ok(immutablePush >= 0, 'immutable SHA push step is required')
assert.ok(bootstrapSecretValidation >= 0 && bootstrapSecretValidation < immutablePush, 'bootstrap secrets must be validated before image publication')
assert.ok(imageSmoke >= 0 && imageSmoke < immutablePush, 'runtime smoke must pass before immutable images are pushed')
assert.ok(mysqlValidation > immutablePush, 'MySQL validation must follow the immutable push')
assert.ok(rollout > mysqlValidation, 'rollout must follow MySQL validation')
assert.ok(migrationEnable > mysqlValidation, 'backup validation must run before migrations are enabled')
assert.ok(firstAzureImageChange > mysqlValidation, 'backup validation must run before an Azure image change')
assert.ok(latestPublish > rollout, 'latest aliases must be published after rollout')
assert.match(
  deploy.slice(latestPublish, latestPublish + 240),
  /if: steps\.rollout\.outcome == 'success'/,
  'latest publication must require a successful rollout',
)
assert.doesNotMatch(
  deploy.slice(0, latestPublish),
  /docker push "5eef\/yazoo-(api|frontend):latest"/,
  'latest must not be pushed before rollout',
)
assert.match(deploy, /MYSQL_SERVER: \$\{\{ vars\.AZURE_MYSQL_SERVER_NAME \}\}/)
assert.match(deploy, /\.fullyQualifiedDomainName \/\/ empty/)
assert.match(deploy, /az mysql flexible-server db show/)
assert.match(deploy, /--database-name "\$EXPECTED_DB_NAME"/)
assert.match(deploy, /YAZOO_RUN_PRODUCTION_PREFLIGHT=true/)
assert.match(deploy, /YAZOO_RUN_RELEASE_ADMIN_BOOTSTRAP=true/)
assert.match(deploy, /YAZOO_RELEASE_ADMIN_BOOTSTRAP_ENABLED=true/)
assert.match(deploy, /secrets\.YAZOO_RELEASE_ADMIN_PASSWORD/)
assert.match(deploy, /appsettings delete[\s\S]*YAZOO_RELEASE_ADMIN_PASSWORD/)
assert.match(deploy, /timeout 30s az webapp log tail/)
assert.match(deploy, /Production deployment is allowed only from refs\/heads\/main/)
assert.match(deploy, /id-token:\s*write/u)
assert.match(deploy, /client-id:\s*\$\{\{ vars\.AZURE_CLIENT_ID \}\}/u)
assert.match(deploy, /tenant-id:\s*\$\{\{ vars\.AZURE_TENANT_ID \}\}/u)
assert.match(deploy, /subscription-id:\s*\$\{\{ vars\.AZURE_SUBSCRIPTION_ID \}\}/u)
assert.doesNotMatch(deploy, /AZURE_CREDENTIALS/u)
assert.match(ci, /smoke-test-release-images\.sh yazoo-api:ci yazoo-frontend:ci/)
assert.match(read('backend/docker-entrypoint.sh'), /chmod a\+w \/dev\/stdout \/dev\/stderr/)

const manualLatest = dockerHubPublish.indexOf('name: Publish latest aliases from main only')
assert.ok(manualLatest >= 0, 'manual workflow needs a dedicated latest step')
assert.match(
  dockerHubPublish.slice(manualLatest, manualLatest + 220),
  /if: github\.ref == 'refs\/heads\/main'/,
)
assert.match(dockerHubPublish, /\^\[0-9a-f\]\{40\}\$/)
assert.match(dockerHubPublish, /refs\/heads\/\*/)

assert.match(ci, /SONAR_TOKEN:[^\S\r\n]*\r?\n[^\S\r\n]+required: false/)
assert.doesNotMatch(deploy, /secrets: inherit/)
assert.doesNotMatch(dockerHubPublish, /secrets: inherit/)

const actionReferences = workflowContents.flatMap((workflow) =>
  workflow
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- uses:') || line.startsWith('uses:'))
    .map((line) => line.slice(line.indexOf('uses:') + 'uses:'.length).trim().split(/[ \t]+#/u)[0]))

for (const reference of actionReferences) {
  if (reference.startsWith('./')) {
    continue
  }
  assert.match(reference, /^[^@\s]+@[0-9a-f]{40}$/u, `action must use an immutable SHA: ${reference}`)
}

const containerJob = ci.slice(ci.indexOf('container-and-secrets:'))
const containerCheckout = containerJob.indexOf('uses: actions/checkout@')
const fullHistoryCheckout = containerJob.indexOf('fetch-depth: 0')
assert.ok(containerCheckout >= 0 && fullHistoryCheckout > containerCheckout)
assert.match(
  containerJob,
  /pull-requests:\s*read/u,
  'the Gitleaks pull-request scan requires read access to PR commit metadata',
)
assert.match(ci, /npm ci --ignore-scripts/)
assert.match(ci, /\.\/node_modules\/\.bin\/playwright install --with-deps chromium/)
assert.doesNotMatch(ci, /\bnpx\s+playwright\b/u)

const showcaseBranch = startup.indexOf('if [ "${YAZOO_RUN_SHOWCASE_BOOTSTRAP:-false}" = "true" ]')
const showcaseMigration = startup.indexOf('php artisan yazoo:migrate-production', showcaseBranch)
const showcaseBootstrap = startup.indexOf('php artisan yazoo:bootstrap-azure-showcase', showcaseMigration)
const showcasePreflight = startup.indexOf('sh /var/www/html/scripts/run-production-preflight.sh', showcaseBootstrap)
assert.ok(
  showcaseBranch >= 0
    && showcaseMigration > showcaseBranch
    && showcaseBootstrap > showcaseMigration
    && showcasePreflight > showcaseBootstrap,
  'showcase startup must migrate, bootstrap idempotently, then run the production preflight',
)

const normalBranch = startup.indexOf('else\n    if [ "${YAZOO_RUN_RELEASE_ADMIN_BOOTSTRAP:-false}" = "true" ]', showcasePreflight)
const normalConfigurationPreflight = startup.indexOf(
  'sh /var/www/html/scripts/run-production-preflight.sh --configuration-only',
  normalBranch,
)
const normalMigration = startup.indexOf(
  'php artisan yazoo:migrate-production',
  normalConfigurationPreflight,
)
const normalAdminBootstrap = startup.indexOf(
  'php artisan yazoo:bootstrap-release-admin',
  normalMigration,
)
const normalFullPreflight = startup.indexOf(
  'sh /var/www/html/scripts/run-production-preflight.sh',
  normalAdminBootstrap,
)
assert.ok(
  normalBranch >= 0
    && normalConfigurationPreflight > normalBranch
    && normalMigration > normalConfigurationPreflight
    && normalAdminBootstrap > normalMigration
    && normalFullPreflight > normalAdminBootstrap,
  'normal startup must validate configuration, migrate under lock, bootstrap the release admin, then validate the migrated database',
)

const setupGuard = setup.indexOf('AllowCreateResources')
const setupCreate = setup.indexOf('"group", "create"')
assert.ok(setupGuard >= 0 && setupGuard < setupCreate)
assert.match(setup, /Inspection-only mode/)

const initialGuard = initialConfiguration.indexOf('AllowInitialConfiguration')
const initialCreate = initialConfiguration.indexOf('"group", "create"')
assert.ok(initialGuard >= 0 && initialGuard < initialCreate)
assert.match(initialConfiguration, /initial configuration only/i)

const shouldPublishLatest = (rolloutOutcome) => rolloutOutcome === 'success'
assert.equal(shouldPublishLatest('success'), true)
assert.equal(shouldPublishLatest('failure'), false)

const isMainBranchRef = (ref) => ref === 'refs/heads/main'
assert.equal(isMainBranchRef('refs/heads/main'), true)
assert.equal(isMainBranchRef('refs/heads/feature/release'), false)

const mysqlAllowsMigration = ({ state, retentionDays, earliestRestoreDate }) =>
  state === 'Ready'
  && Number.isInteger(retentionDays)
  && retentionDays >= 7
  && typeof earliestRestoreDate === 'string'
  && earliestRestoreDate.length > 0

assert.equal(mysqlAllowsMigration({
  state: 'Ready',
  retentionDays: 7,
  earliestRestoreDate: 'validation-timestamp',
}), true)
assert.equal(mysqlAllowsMigration({
  state: 'Stopped',
  retentionDays: 7,
  earliestRestoreDate: 'validation-timestamp',
}), false)
assert.equal(mysqlAllowsMigration({
  state: 'Ready',
  retentionDays: 6,
  earliestRestoreDate: 'validation-timestamp',
}), false)
assert.equal(mysqlAllowsMigration({
  state: 'Ready',
  retentionDays: 7,
  earliestRestoreDate: '',
}), false)

console.log('release-guards=ok')
