const vuln = require('vuln-lib');

function get(url) {
  return vuln.fetch(url);
}

module.exports = { get };
