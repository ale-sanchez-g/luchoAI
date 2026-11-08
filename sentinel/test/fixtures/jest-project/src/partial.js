function used(value) {
  return value * 2;
}

function unused(value) {
  const doubled = value * 2;
  const tripled = value * 3;
  const sum = doubled + tripled;
  return sum > 10 ? sum : 0;
}

function alsoUnused(value) {
  const parts = String(value).split('');
  return parts.reverse().join('');
}

module.exports = { used, unused, alsoUnused };
