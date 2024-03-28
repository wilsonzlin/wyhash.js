import { Wyhash } from "./main";

const textEncoder = new TextEncoder();
const utf8 = (s: string) => textEncoder.encode(s);

const inputs = [
  utf8(""),
  utf8("a"),
  utf8("abc"),
  ...Array.from({ length: 100_000 }, () =>
    crypto.getRandomValues(new Uint8Array(Math.floor(Math.random() * 300))),
  ),
];

const wyhash = new Wyhash(42n);

const test = async (name: string, fn: () => Promise<any>) => {
  const started = performance.now();
  await fn();
  const durMs = performance.now() - started;
  console.log(
    name,
    "took",
    durMs,
    "ms;",
    inputs.length / (durMs / 1000),
    "per second",
  );
};
test("wyhash", async () => {
  for (const input of inputs) {
    wyhash.hash(input);
  }
});
test("sha1", async () => {
  await Promise.all(
    inputs.map((input) => crypto.subtle.digest("SHA-1", input)),
  );
});
test("sha256", async () => {
  await Promise.all(
    inputs.map((input) => crypto.subtle.digest("SHA-256", input)),
  );
});
test("sha384", async () => {
  await Promise.all(
    inputs.map((input) => crypto.subtle.digest("SHA-256", input)),
  );
});
test("sha512", async () => {
  await Promise.all(
    inputs.map((input) => crypto.subtle.digest("SHA-512", input)),
  );
});
