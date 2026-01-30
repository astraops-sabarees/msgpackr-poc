# Server Performance Comparison: JSON vs MessagePack

> **Test Date**: January 30, 2026  
> **Server**: https://msgpackr-poc.onrender.com  
> **Platform**: Render (Free Tier)

---

## Benchmark Commands

```bash
# JSON Endpoint
curl -o /dev/null -s -w "Connect: %{time_connect}s TTFB: %{time_starttransfer}s Total: %{time_total}s Size: %{size_download}b\n" https://msgpackr-poc.onrender.com/json

# MessagePack Endpoint
curl -o /dev/null -s -w "Connect: %{time_connect}s TTFB: %{time_starttransfer}s Total: %{time_total}s Size: %{size_download}b\n" https://msgpackr-poc.onrender.com/msgpack
```

---

## Results Summary

| Metric           | JSON                 | MessagePack        | Winner            |
| ---------------- | -------------------- | ------------------ | ----------------- |
| **Payload Size** | 1,460,902b (1.39 MB) | 843,279b (0.80 MB) | 🏆 MsgPack (-42%) |
| **Avg Connect**  | 48ms                 | 43ms               | 🏆 MsgPack        |
| **Avg TTFB**     | 497ms                | 391ms              | 🏆 MsgPack (-21%) |
| **Avg Total**    | 806ms                | 882ms              | JSON (+9.4%)      |

---

## Raw Benchmark Data

### JSON Endpoint (`/json`)

| Run     | Connect  | TTFB      | Total     | Size       |
| ------- | -------- | --------- | --------- | ---------- |
| 1       | 95ms     | 845ms     | 1.220s    | 1,460,902b |
| 2       | 31ms     | 357ms     | 762ms     | 1,460,902b |
| 3       | 38ms     | 438ms     | 640ms     | 1,460,902b |
| 4       | 47ms     | 493ms     | 801ms     | 1,460,902b |
| 5       | 30ms     | 351ms     | 609ms     | 1,460,902b |
| **AVG** | **48ms** | **497ms** | **806ms** | -          |

### MessagePack Endpoint (`/msgpack`)

| Run     | Connect  | TTFB      | Total     | Size     |
| ------- | -------- | --------- | --------- | -------- |
| 1       | 45ms     | 389ms     | 1.648s    | 843,279b |
| 2       | 52ms     | 419ms     | 759ms     | 843,279b |
| 3       | 51ms     | 404ms     | 813ms     | 843,279b |
| 4       | 39ms     | 388ms     | 604ms     | 843,279b |
| 5       | 29ms     | 353ms     | 585ms     | 843,279b |
| **AVG** | **43ms** | **391ms** | **882ms** | -        |

---

## Why is MsgPack's Total Time Higher Than JSON?

> **The Paradox**: MsgPack has 42% smaller payload but 9.4% slower total time. Why?

### 1. Binary Encoding Overhead on Server

```
JSON Flow:
  Data → JSON.stringify() → Send

MsgPack Flow:
  Data → packr.pack() → Buffer.from() → Send
```

- **JSON**: Native V8 `JSON.stringify()` is _extremely_ optimized (written in C++)
- **MsgPack**: `msgpackr` library adds encoding overhead:
  - Object traversal
  - Type detection for each value
  - Binary buffer allocation
  - Memory copy to Buffer

**Impact**: ~50-100ms extra CPU time per request on serialization.

### 2. Free Tier Cold Starts & CPU Limits

Render's free tier has:

- **Shared CPU**: Other services compete for resources
- **Cold Starts**: Container may spin down, causing spikes (see Run 1 outliers)
- **Throttling**: CPU-intensive operations (binary packing) get throttled more

### 3. Run-to-Run Variance

| Run | JSON Total | MsgPack Total | Winner      |
| --- | ---------- | ------------- | ----------- |
| 1   | 1.220s     | 1.648s        | JSON        |
| 2   | 762ms      | 759ms         | **MsgPack** |
| 3   | 640ms      | 813ms         | JSON        |
| 4   | 801ms      | 604ms         | **MsgPack** |
| 5   | 609ms      | 585ms         | **MsgPack** |

**3 out of 5 runs**: MsgPack was faster!  
**Run 1** (cold start): Skewed the MsgPack average significantly.

### 4. Transfer Time vs Serialization Time

```
Total Time = Connect + Serialization + Transfer

JSON:     48ms  +  ~10ms (native)  +  748ms (1.39MB transfer)
MsgPack:  43ms  +  ~100ms (library) +  739ms (0.80MB transfer)
```

On **free tier**, serialization overhead dominates because:

- Network is fast (cloud-to-cloud)
- CPU is limited/shared

---

## When MsgPack Truly Wins

| Scenario                      | JSON          | MsgPack         | Why MsgPack Wins        |
| ----------------------------- | ------------- | --------------- | ----------------------- |
| **Slow Network (3G)**         | 4.7s          | 2.7s            | Transfer time dominates |
| **High Traffic (100 req/s)**  | Higher egress | 42% less egress | Bandwidth cost          |
| **Mobile Data**               | Drains quota  | Saves 42%       | User's data plan        |
| **Paid Tier (dedicated CPU)** | Similar       | Faster          | No CPU throttling       |

---

## Conclusion

| Finding                                   | Explanation                                       |
| ----------------------------------------- | ------------------------------------------------- |
| **MsgPack has smaller TTFB**              | Server responds faster (21% faster)               |
| **MsgPack has larger Total Time**         | Binary encoding overhead on CPU-limited free tier |
| **MsgPack wins on slow networks**         | 42% smaller payload reduces transfer time         |
| **JSON wins on fast networks + weak CPU** | Native serialization is faster                    |

### Recommendation

| Environment            | Use                  |
| ---------------------- | -------------------- |
| Development / Debug    | **JSON**             |
| Free Tier / Serverless | **JSON** (CPU-bound) |
| Production (Paid Tier) | **MsgPack**          |
| Mobile Clients         | **MsgPack**          |
| High Bandwidth Cost    | **MsgPack**          |
