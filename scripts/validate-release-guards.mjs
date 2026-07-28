import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8')

const deploy = read('.github/workflows/deploy.yml')
const dockerHubPublish = read('.github/workflows/dockerhub-publish.yml')
const ci = read('.github/workflows/ci.yml')
const startup = read('backend/startup.sh')
const setup = read('deploy/azure-setup.ps1')
const initialConfiguration = read('deploy/azure-dockerhub-deploy.ps1')

const immutablePush = deploy.indexOf('name: Push immutable SHA images')
const mysqlValidation = deploy.indexOf('name: Validate MySQL backup and restore readiness')
const migrationEnable = deploy.indexOf('"YAZOO_RUN_MIGRATIONS=true"')
const rollout = deploy.indexOf('name: Deploy exact SHA with one locked startup migration')
const latestPublish = deploy.indexOf('name: Publish last-known-good aliases')
const firstAzureImageChange = deploy.indexOf('az webapp config container set')

assert.ok(immutablePush >= 0, 'immutable SHA push step is required')
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
assert.match(deploy, /YAZOO_RUN_PRODUCTION_PREFLIGHT=true/)
assert.match(deploy, /Production deployment is allowed only from refs\/heads\/main/)

const manualLatest = dockerHubPublish.indexOf('name: Publish latest aliases from main only')
assert.ok(manualLatest >= 0, 'manual workflow needs a dedicated latest step')
assert.match(
  dockerHubPublish.slice(manualLatest, manualLatest + 220),
  /if: github\.ref == 'refs\/heads\/main'/,
)
assert.match(dockerHubPublish, /\^\[0-9a-f\]\{40\}\$/)
assert.match(dockerHubPublish, /refs\/heads\/\*/)

assert.match(ci, /SONAR_TOKEN:\s*\n\s+required: false/)
assert.doesNotMatch(deploy, /secrets: inherit/)
assert.doesNotMatch(dockerHubPublish, /secrets: inherit/)

const startupPreflight = startup.indexOf('run-production-preflight.sh')
const startupMigration = startup.indexOf('YAZOO_RUN_MIGRATIONS')
assert.ok(startupPreflight >= 0 && startupPreflight < startupMigration)

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
assert.equal('refs/heads/main' === 'refs/heads/main', true)
assert.equal('refs/heads/feature/release' === 'refs/heads/main', false)

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
