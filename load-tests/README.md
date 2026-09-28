# Load tests (on-box Load Test Lab)

Scenarios and the Node runner live under `src/lib/ops/load-lab/`.

**Primary path:** open `/load-test-lab/` on the CapRover host (with flags enabled) and Start.

**CLI (dev):** see [`docs/guides/LOAD_TEST_LAB.md`](../docs/guides/LOAD_TEST_LAB.md).

```bash
npm run test:load:smoke
npm run test:load:public
npm run test:load:hub-read
npm run test:load:capacity
```

Results land in `load-results/` (gitignored).
