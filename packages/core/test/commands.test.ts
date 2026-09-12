import { expect, test } from "bun:test";
import { ManagedRuntime } from "effect";
import { CommandService, makeAppLayer } from "../src/index.js";

test("command interpreter rejects unknown and disabled commands", async () => {
  const runtime = ManagedRuntime.make(makeAppLayer(true));
  try {
    const unknown = await runtime.runPromiseExit(
      CommandService.use((service) =>
        service.execute({ id: "missing", args: {} }),
      ),
    );
    const disabled = await runtime.runPromiseExit(
      CommandService.use((service) =>
        service.execute({
          id: "send-message",
          args: { targetId: "1", body: "x" },
        }),
      ),
    );
    expect(unknown._tag).toBe("Failure");
    expect(disabled._tag).toBe("Failure");
  } finally {
    await runtime.dispose();
  }
});

test("command metadata schemas reject missing arguments", async () => {
  const runtime = ManagedRuntime.make(makeAppLayer(true));
  try {
    const result = await runtime.runPromiseExit(
      CommandService.use((service) =>
        service.execute({
          id: "connect",
          args: { server: "demo" },
        }),
      ),
    );
    expect(result._tag).toBe("Failure");
  } finally {
    await runtime.dispose();
  }
});
