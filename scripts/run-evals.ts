import { runEvals } from '../src/agent/evals';

const results = runEvals();
let group = '';
for (const r of results) {
  if (r.group !== group) console.log(`\n== ${(group = r.group)} ==`);
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id} [${r.kind}] ${r.title}\n      ${r.detail}`);
  if (process.argv.includes('--steps')) for (const st of ('steps' in r && r.steps) || []) console.log(`        · ${st}`);
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} eval cases passed`);
process.exit(passed === results.length ? 0 : 1);
