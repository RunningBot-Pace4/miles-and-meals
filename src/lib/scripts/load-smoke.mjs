const baseUrl = String(process.env.LOAD_TEST_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const path = String(process.env.LOAD_TEST_PATH ?? "/").startsWith("/")
  ? String(process.env.LOAD_TEST_PATH ?? "/")
  : `/${process.env.LOAD_TEST_PATH}`;
const requests = Math.max(1, Math.min(2000, Number(process.env.LOAD_TEST_REQUESTS ?? 100)));
const concurrency = Math.max(1, Math.min(50, Number(process.env.LOAD_TEST_CONCURRENCY ?? 10)));
const timeoutMs = Math.max(500, Math.min(60_000, Number(process.env.LOAD_TEST_TIMEOUT_MS ?? 10_000)));
const maxP95Ms = Math.max(1, Number(process.env.LOAD_TEST_MAX_P95_MS ?? 2_000));
const maxFailureRate = Math.max(0, Math.min(1, Number(process.env.LOAD_TEST_MAX_FAILURE_RATE ?? 0.01)));

const url = new URL(path, `${baseUrl}/`);
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

if (!isLocal && process.env.LOAD_TEST_ALLOW_REMOTE !== "1") {
  console.error(
    `Refusing to load-test remote host ${url.hostname}. Set LOAD_TEST_ALLOW_REMOTE=1 only for an environment you own and are authorized to test.`,
  );
  process.exit(2);
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}

const durations = [];
let succeeded = 0;
let failed = 0;
let nextIndex = 0;

async function worker() {
  while (true) {
    const index = nextIndex++;
    if (index >= requests) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const started = performance.now();
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "MilesMeals-Authorized-LoadSmoke/1.0" },
      });
      durations.push(performance.now() - started);
      if (response.status >= 200 && response.status < 500) succeeded += 1;
      else failed += 1;
      await response.body?.cancel().catch(() => {});
    } catch {
      durations.push(performance.now() - started);
      failed += 1;
    } finally {
      clearTimeout(timeout);
    }
  }
}

console.log(`Load smoke: ${url.toString()} · ${requests} requests · concurrency ${concurrency}`);
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, () => worker()));

const total = succeeded + failed;
const failureRate = total ? failed / total : 1;
const avg = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
const summary = {
  requests: total,
  succeeded,
  failed,
  failureRatePct: Number((failureRate * 100).toFixed(2)),
  averageMs: Math.round(avg),
  p50Ms: Math.round(percentile(durations, 0.5)),
  p95Ms: Math.round(percentile(durations, 0.95)),
  p99Ms: Math.round(percentile(durations, 0.99)),
  maxMs: Math.round(Math.max(0, ...durations)),
};
console.table(summary);

if (failureRate > maxFailureRate) {
  console.error(`Failure rate ${summary.failureRatePct}% exceeds ${(maxFailureRate * 100).toFixed(2)}%.`);
  process.exitCode = 1;
}
if (summary.p95Ms > maxP95Ms) {
  console.error(`P95 ${summary.p95Ms}ms exceeds ${maxP95Ms}ms.`);
  process.exitCode = 1;
}
