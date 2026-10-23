import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')

const dockerfile = read('Dockerfile.demo')
const startup = read('backend/startup.sh')
const operations = read('backend/config/operations.php')
const nginx = read('backend/nginx.demo.conf')
const showcaseEnvironment = read('backend/.env.showcase.example')

assert.match(dockerfile, /npm ci/u)
assert.match(dockerfile, /npm run build/u)
assert.match(dockerfile, /php:8\.4-fpm-alpine/u)
assert.match(dockerfile, /nginx\.demo\.conf/u)
assert.match(startup, /yazoo:bootstrap-showcase/u)
assert.match(startup, /yazoo:ensure-showcase-media/u)
const showcaseStartup = startup.slice(0, startup.indexOf('\nelse\n'))
const orderedStartupSteps = ['yazoo:migrate-production', 'yazoo:bootstrap-showcase', 'yazoo:ensure-showcase-media', 'sh /var/www/html/scripts/run-production-preflight.sh']
let previousStep = -1
for (const step of orderedStartupSteps) {
  const position = showcaseStartup.indexOf(step)
  assert.ok(position > previousStep, `showcase startup must execute ${step} in order`)
  previousStep = position
}
assert.doesNotMatch(showcaseStartup, /yazoo:sync-showcase-credentials/u)
assert.ok(showcaseStartup.indexOf('php artisan cache:clear') > showcaseStartup.indexOf('php artisan yazoo:bootstrap-showcase'), 'promote legacy bootstrap marker before cache purge')
assert.ok(showcaseStartup.indexOf('php artisan cache:clear') < showcaseStartup.indexOf('php artisan yazoo:refresh-showcase-availability'), 'refresh must tolerate the purged cache')

assert.doesNotMatch(showcaseStartup, /--password|YAZOO_SHOWCASE_PASSWORD/u)
assert.doesNotMatch(startup, /bootstrap-azure-showcase/u)
assert.match(operations, /YAZOO_DEPLOYMENT_PROFILE/u)
assert.doesNotMatch(operations, /azurewebsites\.net|mysql\.database\.azure\.com|WEBSITES_/u)
assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html/u)
assert.match(nginx, /location ~ \^\/\(api\|sanctum\|broadcasting\)/u)
assert.match(showcaseEnvironment, /^TRUSTED_PROXIES=REMOTE_ADDR$/mu)
assert.doesNotMatch(showcaseEnvironment, /^TRUSTED_PROXIES=\*$/mu)
assert.match(showcaseEnvironment, /^PORT=8080$/mu)
assert.match(showcaseEnvironment, /^YAZOO_DEPLOYMENT_PROFILE=showcase$/mu)
assert.match(showcaseEnvironment, /^DB_HOST=gateway01\.eu-central-1\.prod\.aws\.tidbcloud\.com$/mu)
assert.match(showcaseEnvironment, /^DB_PORT=4000$/mu)
assert.match(showcaseEnvironment, /^DB_DATABASE=yazoo_showcase$/mu)
assert.match(showcaseEnvironment, /^MYSQL_ATTR_SSL_CA=\/etc\/ssl\/cert\.pem$/mu)
assert.match(showcaseEnvironment, /^YAZOO_REQUIRE_EXPECTED_DATABASE=true$/mu)
assert.match(showcaseEnvironment, /^YAZOO_EXPECTED_DB_NAME=yazoo_showcase$/mu)
assert.match(showcaseEnvironment, /^QUEUE_CONNECTION=sync$/mu)
assert.match(showcaseEnvironment, /^CACHE_STORE=database$/mu)
assert.match(showcaseEnvironment, /^SESSION_DRIVER=database$/mu)
assert.match(showcaseEnvironment, /^YAZOO_SHOWCASE_UPLOADS_ENABLED=false$/mu)
assert.match(showcaseEnvironment, /^YAZOO_REQUIRE_PERSISTENT_STORAGE=false$/mu)
assert.match(showcaseEnvironment, /^YAZOO_RUN_QUEUE_WORKER=false$/mu)
assert.match(showcaseEnvironment, /^YAZOO_RUN_SCHEDULER=false$/mu)
assert.match(showcaseEnvironment, /^SMS_DRIVER=disabled$/mu)
assert.match(showcaseEnvironment, /^CMI_ENABLED=false$/mu)
assert.doesNotMatch(showcaseEnvironment, /^DB_DATABASE=sys$/mu)

console.log('provider-neutral-showcase=ok')
