# ADR 0006: Audio deferred behind a spike

Status: deferred to M3 (2026-09-12)

M0 has no native or Rust audio and reports voice as unavailable. A future isolated subprocess spike may evaluate CPAL and libopus at 48 kHz mono / 20 ms frames. It must prove device enumeration, ten-minute duplex stability, p95 local latency at most 30 ms, bounded underruns, Opus roundtrip, safe transmit stop, no-device startup and target-native execution. Toggle-to-talk is preferred initially because terminals cannot universally report key release.
