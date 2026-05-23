const http = require('http');

const request = (options, data) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
          try { resolve(JSON.parse(body || '{}')); } catch(e) { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

(async () => {
  try {
    console.log("Creating Account...");
    const createRes = await request({
      hostname: 'localhost',
      port: 8081,
      path: '/api/accounts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { accountId: "acc-100", ownerName: "John Doe", initialBalance: 0, currency: "USD" });
    console.log(createRes);

    console.log("\nDepositing 500...");
    const depositRes = await request({
      hostname: 'localhost',
      port: 8081,
      path: '/api/accounts/acc-100/deposit',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { amount: 500, description: "Initial Deposit", transactionId: "txn-001" });
    console.log(depositRes);

    console.log("\nQuerying Account Status...");
    // Give it a small delay for projection to run (though it says synchronously, let's be safe)
    await new Promise(r => setTimeout(r, 100));
    const queryRes = await request({
      hostname: 'localhost',
      port: 8081,
      path: '/api/accounts/acc-100',
      method: 'GET'
    });
    console.log(queryRes);
  } catch(e) {
    console.error(e);
  }
})();
