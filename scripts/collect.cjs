const { mkdir, writeFile } = require('node:fs/promises');
const feeds = ['briefing', 'forest', 'tides'];

async function collect(name) {
  const result = await require('./' + name + '.cjs').handler();
  const data = JSON.parse(result.body);
  // Timestamp each published snapshot, including failed source responses.
  data.retrievedAt ||= new Date().toISOString();
  await writeFile('public/data/' + name + '.json', JSON.stringify(data));
  const statuses = name === 'briefing'
    ? [data.weather.status, data.warnings.status]
    : [data.status];
  if (statuses.includes('error')) console.warn('::warning::' + name + ': source unavailable');
}

async function main() {
  await mkdir('public/data', { recursive: true });
  await Promise.all(feeds.map(collect));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
