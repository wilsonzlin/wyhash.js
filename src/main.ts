import {
  Secret,
  _wyp,
  make_secret,
  wy2gau,
  wy2u01,
  wy2u0k,
  wyhash,
  wyrand,
  wytrand,
} from "./internal";

export * as internal from "./internal";

const textEncoder = new TextEncoder();

export class Wyhash {
  constructor(
    private readonly seed: bigint,
    private readonly secret: Secret = _wyp,
  ) {}

  static makeSecret(seed: bigint) {
    return make_secret(seed);
  }

  hash(data: string | Uint8Array) {
    if (typeof data == "string") {
      data = textEncoder.encode(data);
    }
    return wyhash(data, this.seed, this.secret);
  }
}

export abstract class WyRNG {
  abstract next(): bigint;

  next01() {
    return wy2u01(this.next());
  }

  nextGaussian() {
    return wy2gau(this.next());
  }

  nextRange(minOrMax: bigint, max?: bigint) {
    if (max == undefined) {
      max = minOrMax;
      minOrMax = 0n;
    }
    return minOrMax + wy2u0k(this.next(), max);
  }
}

export class Wyrand extends WyRNG {
  private s: { state: bigint };

  constructor(seed: bigint) {
    super();
    this.s = { state: seed };
  }

  next() {
    return wyrand(this.s);
  }
}

export class Wytrand extends WyRNG {
  private s: { state: bigint };

  constructor(seed: bigint) {
    super();
    this.s = { state: seed };
  }

  next() {
    return wytrand(this.s);
  }
}
