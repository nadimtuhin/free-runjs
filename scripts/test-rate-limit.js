const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api/execute';
// const API_URL = 'https://runjs.app.nadimtuhin.com/api/execute';
const TOTAL_REQUESTS = 1000;
const CONCURRENT_REQUESTS = 10;
const DELAY_BETWEEN_BATCHES = 100; // ms

// Test case definitions
const TEST_CASES = {
  PASS: {
    SUCCESS: 'Success - 200 OK',
    EXPECTED_RATE_LIMIT: 'Pass - Expected Rate Limit',
  },
  FAIL: {
    UNEXPECTED_RATE_LIMIT: 'Fail - Unexpected Rate Limit',
    SERVER_ERROR: 'Fail - Server Error',
    NETWORK_ERROR: 'Fail - Network Error',
    UNEXPECTED_STATUS: 'Fail - Unexpected Status',
  }
};

async function makeRequest(index) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Test different IP scenarios by modifying headers
        'X-Forwarded-For': index % 2 === 0 ? '1.1.1.1' : '2.2.2.2',
      },
      body: JSON.stringify({
        code: 'console.log("test")',
        moduleType: 'esm'
      })
    });

    const status = response.status;
    const data = await response.text();

    // Determine test case result
    let testCase;
    if (status === 200) {
      testCase = TEST_CASES.PASS.SUCCESS;
    } else if (status === 429) {
      // Consider rate limits after certain thresholds as expected
      testCase = index > 50 ? TEST_CASES.PASS.EXPECTED_RATE_LIMIT : TEST_CASES.FAIL.UNEXPECTED_RATE_LIMIT;
    } else if (status >= 500) {
      testCase = TEST_CASES.FAIL.SERVER_ERROR;
    } else {
      testCase = TEST_CASES.FAIL.UNEXPECTED_STATUS;
    }

    return {
      index,
      status,
      testCase,
      data: data.slice(0, 100) // Truncate long responses
    };
  } catch (error) {
    return {
      index,
      status: 'error',
      testCase: TEST_CASES.FAIL.NETWORK_ERROR,
      data: error.message
    };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBatch(startIndex, size) {
  const promises = [];
  for (let i = 0; i < size; i++) {
    promises.push(makeRequest(startIndex + i));
  }
  return Promise.all(promises);
}

async function runTest() {
  console.log(`Starting rate limit test...`);
  console.log(`Total requests: ${TOTAL_REQUESTS}`);
  console.log(`Concurrent requests per batch: ${CONCURRENT_REQUESTS}`);
  console.log(`Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log('----------------------------------------');

  const results = {
    total: 0,
    passes: {
      [TEST_CASES.PASS.SUCCESS]: 0,
      [TEST_CASES.PASS.EXPECTED_RATE_LIMIT]: 0,
    },
    failures: {
      [TEST_CASES.FAIL.UNEXPECTED_RATE_LIMIT]: 0,
      [TEST_CASES.FAIL.SERVER_ERROR]: 0,
      [TEST_CASES.FAIL.NETWORK_ERROR]: 0,
      [TEST_CASES.FAIL.UNEXPECTED_STATUS]: 0,
    }
  };

  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENT_REQUESTS) {
    const batchSize = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - i);
    const batchResults = await runBatch(i, batchSize);

    batchResults.forEach(result => {
      results.total++;

      // Log the result
      console.log(`Request ${result.index + 1}/${TOTAL_REQUESTS}: ${result.testCase} (Status: ${result.status})`);

      // Update counters
      if (result.testCase.startsWith('Pass')) {
        results.passes[result.testCase] = (results.passes[result.testCase] || 0) + 1;
      } else {
        results.failures[result.testCase] = (results.failures[result.testCase] || 0) + 1;
        console.log(`  Details: ${result.data}`);
      }
    });

    if (i + CONCURRENT_REQUESTS < TOTAL_REQUESTS) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log('\n----------------------------------------');
  console.log('Test Summary:');
  console.log(`Total Requests: ${results.total}`);

  console.log('\nPassing Cases:');
  Object.entries(results.passes).forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
  });

  console.log('\nFailing Cases:');
  Object.entries(results.failures).forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
  });

  const totalPasses = Object.values(results.passes).reduce((a, b) => a + b, 0);
  const totalFailures = Object.values(results.failures).reduce((a, b) => a + b, 0);

  console.log('\nOverall Results:');
  console.log(`  Pass Rate: ${((totalPasses / results.total) * 100).toFixed(2)}%`);
  console.log(`  Fail Rate: ${((totalFailures / results.total) * 100).toFixed(2)}%`);
}

// Run the test
runTest().catch(console.error);
