
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: fs.createReadStream('./demo_logs.jsonl'),
  crlfDelay: Infinity
});
// create an array to hold the parsed JSON objects
const logs = [];

rl.on("line", (line) => {
  logs.push(JSON.parse(line));
});

rl.on("close", async () => {
  await replayLogs(logs);
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function replayLogs(logs) {
  if (logs.length === 0) {
    return;
  }
  await fetch("http://localhost:3000/api/logs/ingest", {
  method: "POST",
  headers: {
      "Content-Type": "application/json",
  },
  body: JSON.stringify(logs[0]),
  });

  

  for (let i = 1; i < logs.length; i++) {
    const previousLog = logs[i - 1];
    const currentLog = logs[i];

    const previousTime = new Date(previousLog.timestamp);
    const currentTime = new Date(currentLog.timestamp);

    const delay = (currentTime - previousTime)/800;

    await sleep(delay);

    await fetch("http://localhost:3000/api/logs/ingest", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify(logs[i]),
    });
  }
}

