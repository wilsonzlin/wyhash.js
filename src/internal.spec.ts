import { _wyp, wyhash } from "./internal";

test("wyhash", () => {
  const h = (s: string) => wyhash(new TextEncoder().encode(s), 0n, _wyp);
  expect(h("")).toEqual(10602188539874428322n);
  expect(h("a")).toEqual(12460635889546412024n);
  expect(h("fjsakfdsjkf")).toEqual(2666383502234035417n);
  expect(h("\r*@#*(&$kj Sas da \n")).toEqual(10958792633692157407n);
});
