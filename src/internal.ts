// This is a port of https://github.com/wangyi-fudan/wyhash to TypeScript/JavaScript.
// This port tries to keep as close as possible to the original source code, including C type aliases, function names, variable names, and comments.
// This makes it easier to check for correctness and keep in sync with the original code.
// However, formatting is changed (which is done by Prettier).
// The original author of the wyhash algorithm and library is 王一 Wang Yi <godspeed_china@yeah.net>.
// This port is created by Wilson Lin <code@wilsonl.in>.

type double = number;
type uint64_t = bigint;
export type Secret = readonly [uint64_t, uint64_t, uint64_t, uint64_t];
type Mutable<T> = T extends readonly [...infer U] ? [...U] : never;
const trunc64 = (v: uint64_t) => BigInt.asUintN(64, v);
const asU64 = (v: number) => BigInt(v);
const asF64 = (v: bigint) => Number(v);
const asDV = (p: Uint8Array) =>
  new DataView(p.buffer, p.byteOffset, p.byteLength);
// Do not use `.subarray(offset)`, as {@param offset} could be negative.
const sub = (p: Uint8Array, offset: number) =>
  new Uint8Array(p.buffer, p.byteOffset + offset, p.byteLength - offset);

//protections that produce different results:
//1: normal valid behavior
//2: extra protection against entropy loss (probability=2^-63), aka. "blind multiplication"
const WYHASH_CONDOM = 1;

const _wymum = (A: uint64_t, B: uint64_t): [uint64_t, uint64_t] => {
  let r = A;
  r *= B;
  if (WYHASH_CONDOM > 1) {
    A ^= trunc64(r);
    B ^= trunc64(r >> 64n);
  } else {
    A = trunc64(r);
    B = trunc64(r >> 64n);
  }
  return [A, B];
};

//multiply and xor mix function, aka MUM
const _wymix = (A: uint64_t, B: uint64_t): uint64_t => {
  [A, B] = _wymum(A, B);
  return A ^ B;
};

//read functions
const _wyr8 = (p: Uint8Array): uint64_t => asDV(p).getBigUint64(0, true);
const _wyr4 = (p: Uint8Array): uint64_t => asU64(asDV(p).getUint32(0, true));
const _wyr3 = (p: Uint8Array, k: number): uint64_t =>
  (asU64(p[0]) << 16n) | (asU64(p[k >> 1]) << 8n) | asU64(p[k - 1]);

/**
 * wyhash main function
 */
export const wyhash = (
  key: Uint8Array,
  seed: uint64_t,
  secret: Secret,
): uint64_t => {
  let len = key.length;
  let p = key;
  seed ^= _wymix(seed ^ secret[0], secret[1]);
  let a: uint64_t;
  let b: uint64_t;
  if (len <= 16) {
    if (len >= 4) {
      a = (_wyr4(p) << 32n) | _wyr4(sub(p, (len >> 3) << 2));
      b =
        (_wyr4(sub(p, len - 4)) << 32n) |
        _wyr4(sub(p, len - 4 - ((len >> 3) << 2)));
    } else if (len > 0) {
      a = _wyr3(p, len);
      b = 0n;
    } else a = b = 0n;
  } else {
    let i = len;
    if (i >= 48) {
      let see1 = seed,
        see2 = seed;
      do {
        seed = _wymix(_wyr8(p) ^ secret[1], _wyr8(sub(p, 8)) ^ seed);
        see1 = _wymix(_wyr8(sub(p, 16)) ^ secret[2], _wyr8(sub(p, 24)) ^ see1);
        see2 = _wymix(_wyr8(sub(p, 32)) ^ secret[3], _wyr8(sub(p, 40)) ^ see2);
        p = sub(p, 48);
        i -= 48;
      } while (i >= 48);
      seed ^= see1 ^ see2;
    }
    while (i > 16) {
      seed = _wymix(_wyr8(p) ^ secret[1], _wyr8(sub(p, 8)) ^ seed);
      i -= 16;
      p = sub(p, 16);
    }
    a = _wyr8(sub(p, i - 16));
    b = _wyr8(sub(p, i - 8));
  }
  a ^= secret[1];
  b ^= seed;
  [a, b] = _wymum(a, b);
  return _wymix(a ^ secret[0] ^ asU64(len), b ^ secret[1]);
};

//the default secret parameters
export const _wyp: Secret = [
  0x2d358dccaa6c78a5n,
  0x8bb84b93962eacc9n,
  0x4b33a62ed433d4a3n,
  0x4d5a2da51de1aa47n,
];

/**
 * a useful 64bit-64bit mix function to produce deterministic pseudo random numbers that can pass BigCrush and PractRand
 */
export const wyhash64 = (A: uint64_t, B: uint64_t): uint64_t => {
  A ^= 0x2d358dccaa6c78a5n;
  B ^= 0x8bb84b93962eacc9n;
  [A, B] = _wymum(A, B);
  return _wymix(A ^ 0x2d358dccaa6c78a5n, B ^ 0x8bb84b93962eacc9n);
};

/**
 * The wyrand PRNG that pass BigCrush and PractRand
 */
export const wyrand = (s: { state: uint64_t }) => {
  s.state += 0x2d358dccaa6c78a5n;
  return _wymix(s.state, s.state ^ 0x8bb84b93962eacc9n);
};

/**
 * convert any 64 bit pseudo random numbers to uniform distribution [0,1). It can be combined with wyrand, wyhash64 or wyhash.
 */
export const wy2u01 = (r: uint64_t): double => {
  const _wynorm = 1.0 / Math.pow(2, 52);
  return asF64(r >> 12n) * _wynorm;
};

/**
 * convert any 64 bit pseudo random numbers to APPROXIMATE Gaussian distribution. It can be combined with wyrand, wyhash64 or wyhash.
 */
export const wy2gau = (r: uint64_t): double => {
  const _wynorm = 1.0 / Math.pow(2, 20);
  return (
    asF64(
      (r & 0x1fffffn) + ((r >> 21n) & 0x1fffffn) + ((r >> 42n) & 0x1fffffn),
    ) *
      _wynorm -
    3.0
  );
};

/**
 * The wytrand true random number generator, passed BigCrush.
 */
export const wytrand = (s: { state: uint64_t }): uint64_t => {
  const t = new Date();
  let teed: uint64_t = asU64(t.getTime()) * 1000n;
  teed = _wymix(teed ^ _wyp[0], s.state ^ _wyp[1]);
  s.state = _wymix(teed ^ _wyp[0], _wyp[2]);
  return _wymix(s.state, s.state ^ _wyp[3]);
};

/**
 * fast range integer random number generation on [0,k) credit to Daniel Lemire. May not work when WYHASH_32BIT_MUM=1. It can be combined with wyrand, wyhash64 or wyhash.
 */
export const wy2u0k = (r: uint64_t, k: uint64_t): uint64_t => {
  [r, k] = _wymum(r, k);
  return k;
};

// modified from https://github.com/going-digital/Prime64
const mul_mod = (a: uint64_t, b: uint64_t, m: uint64_t): uint64_t => {
  let r = 0n;
  while (b) {
    if (b & 1n) {
      let r2 = r + a;
      if (r2 < r) r2 -= m;
      r = r2 % m;
    }
    b >>= 1n;
    if (b) {
      let a2 = a + a;
      if (a2 < a) a2 -= m;
      a = a2 % m;
    }
  }
  return r;
};
const pow_mod = (a: uint64_t, b: uint64_t, m: uint64_t): uint64_t => {
  let r = 1n;
  while (b) {
    if (b & 1n) r = mul_mod(r, a, m);
    b >>= 1n;
    if (b) a = mul_mod(a, a, m);
  }
  return r;
};
const sprp = (n: uint64_t, a: uint64_t): boolean => {
  let d = n - 1n;
  let s = 0;
  while (!(d & 0xffn)) {
    d >>= 8n;
    s += 8;
  }
  if (!(d & 0xfn)) {
    d >>= 4n;
    s += 4;
  }
  if (!(d & 0x3n)) {
    d >>= 2n;
    s += 2;
  }
  if (!(d & 0x1n)) {
    d >>= 1n;
    s += 1;
  }
  let b = pow_mod(a, d, n);
  if (b == 1n || b == n - 1n) return true;
  let r: number;
  for (r = 1; r < s; r++) {
    b = mul_mod(b, b, n);
    if (b <= 1) return false;
    if (b == n - 1n) return true;
  }
  return false;
};
const is_prime = (n: uint64_t): boolean => {
  if (n < 2 || !(n & 1n)) return false;
  if (n < 4) return true;
  if (!sprp(n, 2n)) return false;
  if (n < 2047) return true;
  if (!sprp(n, 3n)) return false;
  if (!sprp(n, 5n)) return false;
  if (!sprp(n, 7n)) return false;
  if (!sprp(n, 11n)) return false;
  if (!sprp(n, 13n)) return false;
  if (!sprp(n, 17n)) return false;
  if (!sprp(n, 19n)) return false;
  if (!sprp(n, 23n)) return false;
  if (!sprp(n, 29n)) return false;
  if (!sprp(n, 31n)) return false;
  if (!sprp(n, 37n)) return false;
  return true;
};
//make your own secret
export const make_secret = (seed: uint64_t): Secret => {
  const c = [
    15, 23, 27, 29, 30, 39, 43, 45, 46, 51, 53, 54, 57, 58, 60, 71, 75, 77, 78,
    83, 85, 86, 89, 90, 92, 99, 101, 102, 105, 106, 108, 113, 114, 116, 120,
    135, 139, 141, 142, 147, 149, 150, 153, 154, 156, 163, 165, 166, 169, 170,
    172, 177, 178, 180, 184, 195, 197, 198, 201, 202, 204, 209, 210, 212, 216,
    225, 226, 228, 232, 240,
  ];
  const secret: Mutable<Secret> = [0n, 0n, 0n, 0n];
  const s = { state: seed };
  for (let i = 0; i < 4; i++) {
    let ok: boolean;
    do {
      ok = true;
      secret[i] = 0n;
      for (let j = 0n; j < 64n; j += 8n)
        secret[i] |= asU64(c[Number(wyrand(s)) % c.length]) << j;
      if (secret[i] % 2n == 0n) {
        ok = false;
        continue;
      }
      for (let j = 0; j < i; j++) {
        //manual popcount
        let x = secret[j] ^ secret[i];
        x -= (x >> 1n) & 0x5555555555555555n;
        x = (x & 0x3333333333333333n) + ((x >> 2n) & 0x3333333333333333n);
        x = (x + (x >> 4n)) & 0x0f0f0f0f0f0f0f0fn;
        x = (x * 0x0101010101010101n) >> 56n;
        if (x != 32n) {
          ok = false;
          break;
        }
      }
      if (ok && !is_prime(secret[i])) ok = false;
    } while (!ok);
  }
  return secret;
};
