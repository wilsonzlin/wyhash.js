# wyhash.js

A port of [wyhash](https://github.com/wangyi-fudan/wyhash) to pure JavaScript, with TypeScript type definitions.

wyhash is a fast and solid non-cryptographic hash function. Its code is relatively simple and system-independent (endianness and bitness), making it easy to correctly port to and generate consistent hashes from many different languages and platforms.

A simpler API is provided, while all original functions and constants are available under the `internal` exported object.

If WASM is available, a WebAssembly binding to the original library may be faster.

## Usage

Add this to your project:

```
npm i wyhash.js
```

### Use the simpler API:

```ts
import { Wyhash } from "wyhash.js";

const seed = 42n;
const hasher = new Wyhash(seed);
const h1 = hasher.hash("Hello!");
const h2 = hasher.hash(new Uint8Array([3, 5, 8]));
```

See [main.ts](./src/main.ts) for the full API.

### Use the internal API:

```ts
import { internal } from "wyhash.js";

const data = new TextEncoder().encode("Hello");
const secret: internal.Secret = internal._wyp;
const h = internal.wyhash(data, 42n, secret);
```

See [internal.ts](./src/internal.ts) for the full API.
