# JSON vs MessagePack Performance Comparison

> **Test Date**: January 30, 2026  
> **Environment**: NestJS Application with msgpackr library  
> **Data**: AWS Cloud Resource Configuration (~58,000 lines, nested objects)

---

## Benchmark Results (Local Environment)

### Response Metrics

| Metric               | JSON                      | MessagePack             | Difference |
| -------------------- | ------------------------- | ----------------------- | ---------- |
| **Payload Size**     | 1,460,902 bytes (1.39 MB) | 843,279 bytes (0.80 MB) | **-42.3%** |
| **Avg Connect Time** | 0.143ms                   | 0.217ms                 | +51.7%     |
| **Avg TTFB**         | 3.15ms                    | 4.26ms                  | +35.2%     |
| **Avg Total Time**   | 4.04ms                    | 4.75ms                  | +17.6%     |

### Raw Benchmark Data

```
JSON Runs:
  Run 1: Connect: 0.210ms | TTFB: 3.618ms | Total: 4.750ms
  Run 2: Connect: 0.162ms | TTFB: 3.180ms | Total: 3.825ms
  Run 3: Connect: 0.119ms | TTFB: 3.043ms | Total: 3.527ms
  Run 4: Connect: 0.113ms | TTFB: 2.925ms | Total: 4.023ms
  Run 5: Connect: 0.113ms | TTFB: 2.969ms | Total: 4.075ms

MsgPack Runs:
  Run 1: Connect: 0.228ms | TTFB: 4.302ms | Total: 4.947ms
  Run 2: Connect: 0.219ms | TTFB: 3.982ms | Total: 4.454ms
  Run 3: Connect: 0.164ms | TTFB: 4.175ms | Total: 4.549ms
  Run 4: Connect: 0.246ms | TTFB: 4.510ms | Total: 5.168ms
  Run 5: Connect: 0.228ms | TTFB: 4.341ms | Total: 4.646ms
```

---

## Local vs Server Environment Analysis

### Local Environment (localhost)

| Factor             | Impact                          |
| ------------------ | ------------------------------- |
| Network Latency    | **Negligible** (~0.1-0.2ms)     |
| Primary Bottleneck | CPU serialization overhead      |
| Bandwidth Savings  | Not impactful (no real network) |
| Observed Winner    | JSON (faster serialization)     |

### Server/Production Environment

| Factor             | Impact                               |
| ------------------ | ------------------------------------ |
| Network Latency    | **Significant** (10-500ms typical)   |
| Primary Bottleneck | **Bandwidth & Transfer Time**        |
| Bandwidth Savings  | **Critical** (42% reduction matters) |
| Expected Winner    | **MessagePack**                      |

### Network Scenario Calculations

Assuming 50 Mbps connection (typical mobile/moderate bandwidth):

| Scenario       | JSON Transfer | MsgPack Transfer | Savings            |
| -------------- | ------------- | ---------------- | ------------------ |
| Single Request | 234ms         | 135ms            | **99ms (~42%)**    |
| 100 Requests   | 23.4s         | 13.5s            | **9.9s saved**     |
| 1000 Requests  | 3.9 min       | 2.25 min         | **1.65 min saved** |

_At slower connections (10 Mbps), savings multiply by 5x._

---

## Pros and Cons

### JSON

| ✅ Pros                                       | ❌ Cons                               |
| --------------------------------------------- | ------------------------------------- |
| Human-readable and debuggable                 | Larger payload size (+73% vs MsgPack) |
| No encoding/decoding overhead                 | No native binary type support         |
| Universal browser support                     | Higher bandwidth costs                |
| Native `JSON.stringify()` is highly optimized | Verbose for numeric data              |
| Excellent tooling (Postman, curl, etc.)       | String-heavy format                   |
| No additional dependencies                    | Slower over network                   |

### MessagePack (msgpackr)

| ✅ Pros                               | ❌ Cons                         |
| ------------------------------------- | ------------------------------- |
| **42% smaller payload**               | Not human-readable              |
| Efficient binary encoding             | Encoding overhead on server     |
| Native binary type support            | Requires client-side decoder    |
| Faster network transfer (real world)  | Harder to debug (binary format) |
| Supports streaming with `PackrStream` | Less tooling support            |
| Lower bandwidth costs                 | Library dependency required     |
| Better for mobile/slow networks       | Learning curve for team         |

---

## When to Use Each Format

### Choose JSON When:

- 🔹 **Debugging is frequent** - Human readability is essential
- 🔹 **Payloads are small** (<10 KB) - Overhead isn't justified
- 🔹 **Browser clients lack MsgPack support** - No decoder available
- 🔹 **Local/internal services** - Network isn't the bottleneck
- 🔹 **Rapid development** - Simpler implementation

### Choose MessagePack When:

- 🔸 **Large payloads** (>100 KB) - 42% reduction is significant
- 🔸 **High-frequency API calls** - Bandwidth savings compound
- 🔸 **Mobile clients** - Bandwidth is precious/metered
- 🔸 **Slow networks** - Transfer time dominates response time
- 🔸 **Binary data included** - Native support for blobs
- 🔸 **Cost optimization** - Cloud egress fees reduction

---

## Implementation Notes

### Current Setup

```typescript
// Server-side (NestJS)
import { Packr } from 'msgpackr';

private packr = new Packr({ useRecords: true });

@Get('msgpack')
getMsgPack(@Res({ passthrough: true }) res: Response) {
  res.set('Content-Type', 'application/msgpack');
  res.send(Buffer.from(this.packr.pack(data)));
}
```

### Client-Side Decoding Example

```typescript
import { Packr } from 'msgpackr';

const response = await fetch('/msgpack');
const buffer = await response.arrayBuffer();
const packr = new Packr({ useRecords: true });
const data = packr.unpack(new Uint8Array(buffer));
```

---

## Recommendations

| Scenario                   | Recommendation               |
| -------------------------- | ---------------------------- |
| Development/Debug APIs     | **JSON**                     |
| Production Dashboard APIs  | **JSON** (large, infrequent) |
| Real-time Data Streaming   | **MessagePack**              |
| Mobile App Backends        | **MessagePack**              |
| Microservice Communication | **MessagePack** (internal)   |
| Public REST APIs           | **JSON** (compatibility)     |

---

## Summary

> **Local Testing Paradox**: JSON appears faster locally because serialization overhead dominates. In production with real network conditions, **MessagePack's 42% smaller size translates to significant performance gains**.

For this specific dataset (1.4 MB JSON → 0.8 MB MsgPack):

- **Local**: JSON wins by ~0.7ms per request
- **Network**: MsgPack wins by **~100ms+ per request** on typical connections

Choose based on your **actual bottleneck**: CPU (local) vs **Bandwidth (production)**.
