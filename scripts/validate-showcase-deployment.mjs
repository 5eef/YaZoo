import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')

const dockerfile = read('Dockerfile.demo')
const startup = read('backend/startup.sh')
const operations = read('backend/config/operations.php')
const nginx = read('backend/nginx.demo.conf')

assert.match(dockerfile, /npm ci/u)
assert.match(dockerfile, /npm run build/u)
assert.match(dockerfile, /php:8\.4-fpm-alpine/u)
assert.match(dockerfile, /nginx\.demo\.conf/u)
assert.match(startup, /yazoo:bootstrap-showcase/u)
assert.match(startup, /yazoo:ensure-showcase-media/u)
assert.doesNotMatch(startup, /bootstrap-azure-showcase/u)
assert.match(operations, /YAZOO_DEPLOYMENT_PROFILE/u)
assert.doesNotMatch(operations, /azurewebsites\.net|mysql\.database\.azure\.com|WEBSITES_/u)
assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html/u)
assert.match(nginx, /location ~ \^\/\(api\|sanctum\|broadcasting\)/u)

console.log('provider-neutral-showcase=ok')
