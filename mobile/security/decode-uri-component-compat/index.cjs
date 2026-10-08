// query-string 7 expects a callable CommonJS export. Keep the fixed upstream
// algorithm intact and bridge its ESM default; Node 22.22+ and Metro support it.
module.exports = require('decode-uri-component-fixed').default;
