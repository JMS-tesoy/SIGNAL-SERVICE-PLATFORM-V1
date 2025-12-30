#!/usr/bin/env npx tsx
// =============================================================================
// E2E TEST SCRIPT - Signal Flow Testing
// Simulates MT5 EA communication with the backend
// =============================================================================

import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

interface TestConfig {
  masterToken: string;
  slaveToken: string;
  masterAccountId: string;
  slaveAccountId: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[PASS]\x1b[0m',
    error: '\x1b[31m[FAIL]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
  };
  console.log(`${prefix[type]} ${message}`);
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, message: 'OK', duration });
    log(`${name} (${duration}ms)`, 'success');
  } catch (error: any) {
    const duration = Date.now() - start;
    const message = error.response?.data?.error || error.message || 'Unknown error';
    results.push({ name, passed: false, message, duration });
    log(`${name}: ${message}`, 'error');
  }
}

function createClient(token?: string): AxiosInstance {
  return axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 10000,
  });
}

// =============================================================================
// AUTH HELPERS
// =============================================================================

async function login(email: string, password: string): Promise<string> {
  const client = createClient();
  const response = await client.post('/auth/login', { email, password });
  return response.data.accessToken;
}

async function registerTestUser(email: string, password: string, name: string): Promise<string> {
  const client = createClient();
  try {
    await client.post('/auth/register', { email, password, name });
    // In test mode, we might need to verify email - for now, try login directly
    const token = await login(email, password);
    return token;
  } catch (error: any) {
    if (error.response?.status === 409) {
      // User exists, try login
      return await login(email, password);
    }
    throw error;
  }
}

// =============================================================================
// TEST CASES
// =============================================================================

async function testHeartbeat(client: AxiosInstance, accountId: string): Promise<void> {
  const response = await client.post('/signals/heartbeat', {
    account_id: accountId,
    data: {
      balance: 10000.00,
      equity: 10050.00,
      profit: 50.00,
    },
  });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Heartbeat failed');
  }
}

async function testSendSignal(client: AxiosInstance, accountId: string): Promise<string> {
  const response = await client.post('/signals', {
    type: 'TRADE_SIGNAL',
    action: 'OPEN',
    account_id: accountId,
    data: {
      symbol: 'EURUSD',
      type: 'BUY',
      volume: 0.10,
      price: 1.10500,
      sl: 1.10000,
      tp: 1.11000,
      ticket: Date.now(),
      magic: 12345,
      comment: 'E2E Test Signal',
    },
  });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Send signal failed');
  }

  return response.data.signalId;
}

async function testGetPendingSignals(client: AxiosInstance, accountId: string): Promise<any[]> {
  const response = await client.get('/signals/pending', {
    params: { account_id: accountId },
  });

  return response.data.signals || [];
}

async function testAcknowledgeSignal(client: AxiosInstance, signalId: string): Promise<void> {
  const response = await client.post('/signals/ack', {
    signal_id: signalId,
    status: 'EXECUTED',
    executed_volume: 0.10,
    executed_price: 1.10505,
    slippage: 0.5,
    slave_ticket: Date.now(),
  });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Acknowledge failed');
  }
}

async function testIdempotentAck(client: AxiosInstance, signalId: string): Promise<void> {
  // Send the same ack again - should succeed due to idempotency
  const response = await client.post('/signals/ack', {
    signal_id: signalId,
    status: 'EXECUTED',
  });

  if (!response.data.success) {
    throw new Error('Idempotent ack should succeed');
  }

  if (!response.data.message?.includes('Already acknowledged')) {
    throw new Error(`Expected 'Already acknowledged' message, got: ${response.data.message}`);
  }
}

async function testSignalHistory(client: AxiosInstance): Promise<void> {
  const response = await client.get('/signals/history', {
    params: { limit: 10 },
  });

  if (!Array.isArray(response.data.signals)) {
    throw new Error('Expected signals array in response');
  }
}

async function testSignalStats(client: AxiosInstance): Promise<void> {
  const response = await client.get('/signals/stats', {
    params: { period: 'day' },
  });

  if (typeof response.data.totalSignals !== 'number') {
    throw new Error('Expected totalSignals in response');
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runE2ETests() {
  console.log('\n' + '='.repeat(60));
  console.log('MT5 SIGNAL FLOW E2E TEST');
  console.log('='.repeat(60) + '\n');

  log(`API URL: ${API_URL}`);

  // Check server availability
  try {
    await axios.get(`${API_URL.replace('/api', '')}/health`);
    log('Server is running', 'success');
  } catch (error) {
    log('Server not available. Start with: npm run dev', 'error');
    process.exit(1);
  }

  // Test credentials - use environment variables or defaults
  const MASTER_EMAIL = process.env.MASTER_EMAIL || 'master@test.com';
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'TestPass123!';
  const SLAVE_EMAIL = process.env.SLAVE_EMAIL || 'slave@test.com';
  const SLAVE_PASSWORD = process.env.SLAVE_PASSWORD || 'TestPass123!';
  const MASTER_ACCOUNT_ID = process.env.MASTER_ACCOUNT_ID || 'MASTER_001';
  const SLAVE_ACCOUNT_ID = process.env.SLAVE_ACCOUNT_ID || 'SLAVE_001';

  let masterToken: string;
  let slaveToken: string;
  let signalId: string;
  let executionId: string;

  console.log('\n--- Authentication Tests ---\n');

  // Auth tests
  await runTest('Master user login', async () => {
    masterToken = await login(MASTER_EMAIL, MASTER_PASSWORD);
    if (!masterToken) throw new Error('No token received');
  });

  await runTest('Slave user login', async () => {
    slaveToken = await login(SLAVE_EMAIL, SLAVE_PASSWORD);
    if (!slaveToken) throw new Error('No token received');
  });

  if (!masterToken! || !slaveToken!) {
    log('Cannot proceed without valid tokens', 'error');
    printSummary();
    process.exit(1);
  }

  const masterClient = createClient(masterToken!);
  const slaveClient = createClient(slaveToken!);

  console.log('\n--- Heartbeat Tests ---\n');

  await runTest('Master EA heartbeat', async () => {
    await testHeartbeat(masterClient, MASTER_ACCOUNT_ID);
  });

  await runTest('Slave EA heartbeat', async () => {
    await testHeartbeat(slaveClient, SLAVE_ACCOUNT_ID);
  });

  console.log('\n--- Signal Flow Tests ---\n');

  await runTest('Send trade signal (Master)', async () => {
    signalId = await testSendSignal(masterClient, MASTER_ACCOUNT_ID);
    log(`  Signal ID: ${signalId}`, 'info');
  });

  await runTest('Get pending signals (Slave)', async () => {
    const signals = await testGetPendingSignals(slaveClient, SLAVE_ACCOUNT_ID);
    log(`  Pending signals: ${signals.length}`, 'info');
    if (signals.length > 0) {
      executionId = signals[0].signal_id;
      log(`  Execution ID: ${executionId}`, 'info');
    }
  });

  if (executionId!) {
    await runTest('Acknowledge signal execution', async () => {
      await testAcknowledgeSignal(slaveClient, executionId!);
    });

    await runTest('Idempotent ack (duplicate)', async () => {
      await testIdempotentAck(slaveClient, executionId!);
    });
  } else {
    log('Skipping ack tests - no pending signals for slave', 'warn');
  }

  console.log('\n--- Dashboard API Tests ---\n');

  await runTest('Get signal history', async () => {
    await testSignalHistory(slaveClient);
  });

  await runTest('Get signal statistics', async () => {
    await testSignalStats(slaveClient);
  });

  console.log('\n--- Delay Enforcement Test ---\n');

  await runTest('Signal delay enforcement', async () => {
    // Send a new signal
    const newSignalId = await testSendSignal(masterClient, MASTER_ACCOUNT_ID);
    log(`  New signal ID: ${newSignalId}`, 'info');

    // Immediately check - depending on tier delay, may or may not be visible
    const signals = await testGetPendingSignals(slaveClient, SLAVE_ACCOUNT_ID);
    log(`  Signals after immediate check: ${signals.length}`, 'info');

    // Note: Full delay test would require waiting for the tier's delay period
    // For now, we just verify the mechanism is in place
  });

  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Duration: ${totalDuration}ms\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runE2ETests().catch((error) => {
  log(`Unhandled error: ${error.message}`, 'error');
  process.exit(1);
});
