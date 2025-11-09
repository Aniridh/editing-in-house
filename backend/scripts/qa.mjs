#!/usr/bin/env node

import fetch from 'node-fetch';
import EventSource from 'eventsource';

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logJson(data, label = 'Response') {
  log(`\n${label}:`, 'cyan');
  console.log(JSON.stringify(data, null, 2));
}

function logError(error) {
  log(`\nError: ${error.message}`, 'red');
  if (error.stack) {
    console.error(error.stack);
  }
}

// Test /api/interpret endpoint
async function testInterpret(text) {
  if (!text) {
    log('Usage: node scripts/qa.mjs interpret "<text>"', 'yellow');
    process.exit(1);
  }

  log(`\nTesting /api/interpret with: "${text}"`, 'bright');
  log(`POST ${API_BASE}/interpret`, 'blue');

  try {
    const response = await fetch(`${API_BASE}/interpret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    const requestId = response.headers.get('x-request-id');

    if (requestId) {
      log(`Request ID: ${requestId}`, 'cyan');
    }

    log(`Status: ${response.status} ${response.statusText}`, response.ok ? 'green' : 'red');
    logJson(data, 'Response');

    if (!response.ok) {
      process.exit(1);
    }

    if (data.actions && Array.isArray(data.actions)) {
      log(`\n✓ Parsed ${data.actions.length} action(s)`, 'green');
      data.actions.forEach((action, i) => {
        log(`  Action ${i + 1}: ${action.type}`, 'cyan');
      });
    }
  } catch (error) {
    logError(error);
    process.exit(1);
  }
}

// Test /api/generate/video endpoint
async function testGenVideo(prompt) {
  if (!prompt) {
    log('Usage: node scripts/qa.mjs gen-video "<prompt>"', 'yellow');
    process.exit(1);
  }

  log(`\nTesting /api/generate/video with: "${prompt}"`, 'bright');
  log(`POST ${API_BASE}/generate/video`, 'blue');

  try {
    const response = await fetch(`${API_BASE}/generate/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    const requestId = response.headers.get('x-request-id');

    if (requestId) {
      log(`Request ID: ${requestId}`, 'cyan');
    }

    log(`Status: ${response.status} ${response.statusText}`, response.ok ? 'green' : 'red');
    logJson(data, 'Response');

    if (!response.ok) {
      process.exit(1);
    }

    if (data.jobId) {
      log(`\n✓ Job created: ${data.jobId}`, 'green');
      log(`  Stream URL: ${API_BASE}/jobs/${data.jobId}/stream`, 'cyan');
      log(`  Status URL: ${API_BASE}/jobs/${data.jobId}`, 'cyan');
    } else if (data.url) {
      log(`\n✓ Generated URL: ${data.url}`, 'green');
    }
  } catch (error) {
    logError(error);
    process.exit(1);
  }
}

// Test /api/jobs/:id/stream SSE endpoint
async function testStream(jobId) {
  if (!jobId) {
    log('Usage: node scripts/qa.mjs stream <jobId>', 'yellow');
    process.exit(1);
  }

  log(`\nTesting /api/jobs/${jobId}/stream (SSE)`, 'bright');
  log(`GET ${API_BASE}/jobs/${jobId}/stream`, 'blue');
  log('\nListening for SSE events... (Press Ctrl+C to stop)\n', 'yellow');

  try {
    const url = `${API_BASE}/jobs/${jobId}/stream`;
    const eventSource = new EventSource(url);

    let eventCount = 0;

    eventSource.onopen = () => {
      log('✓ SSE connection opened', 'green');
    };

    eventSource.onmessage = (event) => {
      eventCount++;
      log(`\n[Event ${eventCount}]`, 'bright');
      log(`Type: ${event.type || 'message'}`, 'cyan');
      
      try {
        const data = JSON.parse(event.data);
        logJson(data, 'Data');
      } catch (e) {
        log(`Data: ${event.data}`, 'cyan');
      }
    };

    eventSource.addEventListener('progress', (event) => {
      eventCount++;
      log(`\n[Event ${eventCount}] Progress`, 'bright');
      try {
        const data = JSON.parse(event.data);
        log(`  Progress: ${data.progress}%`, 'cyan');
        log(`  Status: ${data.status}`, 'cyan');
      } catch (e) {
        log(`  Data: ${event.data}`, 'cyan');
      }
    });

    eventSource.addEventListener('status', (event) => {
      eventCount++;
      log(`\n[Event ${eventCount}] Status`, 'bright');
      try {
        const data = JSON.parse(event.data);
        log(`  Status: ${data.status}`, 'cyan');
        if (data.progress !== undefined) {
          log(`  Progress: ${data.progress}%`, 'cyan');
        }
      } catch (e) {
        log(`  Data: ${event.data}`, 'cyan');
      }
    });

    eventSource.addEventListener('complete', (event) => {
      eventCount++;
      log(`\n[Event ${eventCount}] Complete`, 'bright');
      try {
        const data = JSON.parse(event.data);
        logJson(data, 'Complete Data');
        if (data.url) {
          log(`\n✓ Job completed! URL: ${data.url}`, 'green');
        }
      } catch (e) {
        log(`  Data: ${event.data}`, 'cyan');
      }
      eventSource.close();
      log('\n✓ Stream closed', 'green');
      process.exit(0);
    });

    eventSource.addEventListener('error', (event) => {
      eventCount++;
      log(`\n[Event ${eventCount}] Error`, 'bright');
      try {
        const data = JSON.parse(event.data);
        logJson(data, 'Error Data');
        log(`\n✗ Job error: ${data.error || 'Unknown error'}`, 'red');
      } catch (e) {
        log(`  Data: ${event.data}`, 'cyan');
      }
      eventSource.close();
      log('\n✓ Stream closed', 'green');
      process.exit(1);
    });

    eventSource.addEventListener('heartbeat', (event) => {
      try {
        const data = JSON.parse(event.data);
        log(`[Heartbeat] t=${data.t}`, 'yellow');
      } catch (e) {
        // Ignore heartbeat parse errors
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      log('\n\nInterrupted by user', 'yellow');
      eventSource.close();
      process.exit(0);
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      log('\n\nTimeout after 60 seconds', 'yellow');
      eventSource.close();
      process.exit(0);
    }, 60000);

  } catch (error) {
    logError(error);
    process.exit(1);
  }
}

// Main CLI handler
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'interpret':
    testInterpret(args.join(' '));
    break;
  case 'gen-video':
    testGenVideo(args.join(' '));
    break;
  case 'stream':
    testStream(args[0]);
    break;
  default:
    log('QA Tool for Backend Endpoints', 'bright');
    log('\nUsage:', 'yellow');
    log('  node scripts/qa.mjs interpret "<text>"', 'cyan');
    log('  node scripts/qa.mjs gen-video "<prompt>"', 'cyan');
    log('  node scripts/qa.mjs stream <jobId>', 'cyan');
    log('\nEnvironment:', 'yellow');
    log(`  API_URL (default: ${BASE_URL})`, 'cyan');
    process.exit(command ? 1 : 0);
}

