import { strict as assert } from 'node:assert'; // Or 'assert' if Node.js < 16
import testUtils, { GLOBAL } from '../test-utils';
import LATENCY_RESET, { LATENCY_EVENTS } from './LATENCY_RESET';
// parseArgs is no longer needed if we only run the integration test
// import { parseArgs } from './generic-transformers';

describe('LATENCY RESET - Simplified Test', function () {
    // Set a longer timeout for the entire test suite, including setup hooks
    // This is crucial for the Docker container to spin up and client to connect.
    this.timeout(90000); // 90 seconds

    // Integration test: Execute LATENCY RESET against a real Redis client
    // This test will:
    // 1. Spin up a Redis Docker container via testUtils.testWithClient.
    // 2. Connect the Redis client.
    // 3. Set the latency monitor threshold.
    // 4. Generate a controlled latency event using DEBUG SLEEP.
    // 5. Execute LATENCY RESET without arguments (resets all).
    // 6. Verify that LATENCY LATEST returns an empty array, confirming the reset.
    testUtils.testWithClient('should reset all latency events after a single delay', async client => {
        // 1. Set a latency monitor threshold to ensure events are logged
        console.log('Test Step: Setting latency-monitor-threshold to 1ms...');
        await client.configSet('latency-monitor-threshold', '1');
        console.log('Test Step: Latency-monitor-threshold set.');

        // 2. Generate a clear latency event (e.g., by sleeping for 100ms)
        console.log('Test Step: Executing DEBUG SLEEP 0.1s to generate latency...');
        await client.sendCommand(['DEBUG', 'SLEEP', '0.1']); // Sleep for 100ms
        console.log('Test Step: DEBUG SLEEP executed.');

        // Optional: Verify latency was recorded before reset
        const latestLatencyBeforeReset = await client.latencyLatest();
        console.log('Test Step: Latest Latency Events (before reset):', JSON.stringify(latestLatencyBeforeReset, null, 2));
        assert.ok(latestLatencyBeforeReset.length > 0, 'Expected latency events to be recorded before reset.');
        assert.equal(latestLatencyBeforeReset[0][0], 'command', 'Expected "command" event to be recorded.');
        // Fix: Convert the value to a number before comparison to avoid TypeScript error
        assert.ok(Number(latestLatencyBeforeReset[0][2]) >= 100, 'Expected latest latency for "command" to be at least 100ms.');

        // 3. Execute LATENCY RESET command (no arguments, resets all)
        console.log('Test Step: Executing LATENCY RESET (all events)...');
        const resetAllResult = await client.latencyReset();
        console.log(`Test Step: LATENCY RESET (all events) returned: ${resetAllResult} events reset.`);
        // A successful reset usually returns 1 (meaning 1 event type was reset, e.g., 'command')
        assert.equal(typeof resetAllResult, 'number');
        assert.ok(resetAllResult >= 0); // Should be 1 if 'command' was reset, or 0 if none were logged.

        // 4. Verify that LATENCY LATEST returns an empty array after reset
        console.log('Test Step: Verifying Latency Events (after reset)...');
        const latestLatencyAfterAllReset = await client.latencyLatest();
        console.log('Test Step: Latest Latency Events (after all reset):', JSON.stringify(latestLatencyAfterAllReset, null, 2));
        assert.deepEqual(latestLatencyAfterAllReset, [], 'Expected no latency events after reset.');

    }, {
        // These options are passed to testUtils.testWithClient for setting up the Redis server and client.
        // The 'timeout' property here is part of the GLOBAL.SERVERS.OPEN configuration,
        // which the test-utils library might use for its internal setup.
        // We keep the clientOptions to ensure the client connection itself has a sufficient timeout.
        ...GLOBAL.SERVERS.OPEN,
        clientOptions: {
            socket: {
                connectTimeout: 60000 // Set client connection timeout to 60 seconds (60000ms)
            }
        }
    });
});
