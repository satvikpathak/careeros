import { describe, it, expect } from "vitest";
import { isAllowlistedHost, isPrivateHostname } from "@/lib/jd/allowlist";

describe("isAllowlistedHost", () => {
  it("accepts greenhouse.io subdomain", () => {
    expect(isAllowlistedHost("boards.greenhouse.io")).toBe(true);
  });
  it("accepts lever.co subdomain", () => {
    expect(isAllowlistedHost("jobs.lever.co")).toBe(true);
  });
  it("rejects example.com", () => {
    expect(isAllowlistedHost("example.com")).toBe(false);
  });
  it("rejects greenhouse.io.evil.com", () => {
    expect(isAllowlistedHost("greenhouse.io.evil.com")).toBe(false);
  });
  it("accepts workday + myworkdayjobs", () => {
    expect(isAllowlistedHost("careers.workday.com")).toBe(true);
    expect(isAllowlistedHost("careers.myworkdayjobs.com")).toBe(true);
  });
});

describe("isPrivateHostname", () => {
  it("flags localhost", () => {
    expect(isPrivateHostname("localhost")).toBe(true);
  });
  it("flags 127.0.0.1", () => {
    expect(isPrivateHostname("127.0.0.1")).toBe(true);
  });
  it("flags 10.0.0.5", () => {
    expect(isPrivateHostname("10.0.0.5")).toBe(true);
  });
  it("flags 192.168.1.1", () => {
    expect(isPrivateHostname("192.168.1.1")).toBe(true);
  });
  it("does not flag 8.8.8.8", () => {
    expect(isPrivateHostname("8.8.8.8")).toBe(false);
  });
});
