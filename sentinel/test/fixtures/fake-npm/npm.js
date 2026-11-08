#!/usr/bin/env node
// Test stand-in for npm: applies the JSON edits a scenario file lists for each command.
const fs = require('fs');

const scenario = JSON.parse(fs.readFileSync(process.env.FAKE_NPM_SCENARIO, 'utf8'));
const args = process.argv.slice(2).join(' ');
if (process.env.FAKE_NPM_LOG) {
  fs.appendFileSync(process.env.FAKE_NPM_LOG, `${args}\n`);
}
const entry = scenario.commands.find((c) => args.startsWith(c.match));
if (!entry) {
  process.stderr.write(`fake npm: no scenario for "${args}"\n`);
  process.exit(97);
}
for (const edit of entry.edits || []) {
  const doc = JSON.parse(fs.readFileSync(edit.file, 'utf8'));
  let target = doc;
  for (const key of edit.path.slice(0, -1)) {
    target[key] = target[key] || {};
    target = target[key];
  }
  const last = edit.path[edit.path.length - 1];
  if (edit.value === null) {
    delete target[last];
  } else {
    target[last] = edit.value;
  }
  fs.writeFileSync(edit.file, `${JSON.stringify(doc, null, 2)}\n`);
}
if (entry.stdout !== undefined) {
  process.stdout.write(typeof entry.stdout === 'string' ? entry.stdout : JSON.stringify(entry.stdout));
}
if (entry.stderr) {
  process.stderr.write(entry.stderr);
}
process.exit(entry.exitCode || 0);
