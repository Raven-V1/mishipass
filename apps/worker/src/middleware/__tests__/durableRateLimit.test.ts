import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkDurableRateLimit } from "../durableRateLimit.js";

function makeDb(row: { count: number } | null) {
  const first = vi.fn().mockResolvedValue(row);
  const run = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
  const bind = vi.fn().mockReturnValue({ first, run });
  const prepare = vi.fn().mockReturnValue({ bind });

  return {
    db: { prepare } as unknown as D1Database,
    prepare,
    bind,
    first,
    run,
  };
}

beforeEach(() => {
  vi.useRealTimers();
});

describe("checkDurableRateLimit", () => {
  it("allows a request and writes the D1-backed rate limit row", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:34:56Z"));
    const fake = makeDb(null);
    const hashedKey = "sighting:hmac_abcdef1234567890:MP-MX-7X3B-9K21";

    const allowed = await checkDurableRateLimit(fake.db, hashedKey, 3, 10);

    expect(allowed).toBe(true);
    expect(fake.prepare).toHaveBeenCalledWith("SELECT count FROM rate_limits WHERE key = ? AND window_start = ?");
    expect(fake.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO rate_limits"));
    expect(fake.bind).toHaveBeenCalledWith(hashedKey, "2026-06-30T12:30:00.000Z");
    expect(fake.bind).toHaveBeenCalledWith(hashedKey, "2026-06-30T12:30:00.000Z");
    expect(fake.run).toHaveBeenCalledOnce();
  });

  it("blocks when the current D1 window count has reached the limit", async () => {
    const fake = makeDb({ count: 3 });

    const allowed = await checkDurableRateLimit(fake.db, "lookup:hmac_key:MP-MX-7X3B-9K21", 3, 1);

    expect(allowed).toBe(false);
    expect(fake.run).not.toHaveBeenCalled();
  });

  it("keeps raw IP addresses out of the limiter key supplied by callers", async () => {
    const fake = makeDb(null);
    const rawIp = "203.0.113.10";
    const hashedKey = "lookup:8d969eef6ecad3c2:MP-MX-7X3B-9K21";

    await checkDurableRateLimit(fake.db, hashedKey, 60, 1);

    const boundValues = fake.bind.mock.calls.flat();
    expect(boundValues).toContain(hashedKey);
    expect(boundValues).not.toContain(rawIp);
  });
});
