import { loadConfig } from './config.js';
import { ApiClient } from './api.js';
import { fetchPage } from './browser.js';
import { run } from './run.js';

const controller = new AbortController();
let sawChallenge = false;
const log = data => {
  if (data.event === 'challenge_detected') sawChallenge = true;
  console.log(JSON.stringify({ at: new Date().toISOString(), ...data }));
};
for (const event of ['SIGTERM', 'SIGINT']) process.once(event, () => {
  log({ event: 'shutdown_requested', signal: event });
  controller.abort();
});
try {
  const config = loadConfig();
  const result = await run(config, { api: new ApiClient(config), fetchPage, signal: controller.signal, log });
  process.exitCode = result.stoppedByChallenge ? 2 : result.errors ? 1 : 0;
} catch {
  log({ event: 'run_failed', error: 'configuration_or_api_failure' });
  process.exitCode = sawChallenge ? 2 : 1;
}
