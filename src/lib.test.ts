import fs from "fs/promises";
import path from "path";
import { decode, encode } from "./lib";

function compareBytes(got: Uint8Array, expected: Uint8Array): boolean {
  if (got.length !== expected.length) {
    console.log(
      `bytes length not equal, got: ${got.length}, expected: ${expected.length}}`
    );
    return false;
  }
  for (let i = 0; i < got.length; i++) {
    if (got[i] !== expected[i]) {
      console.log(
        `bytes not equal at index: ${i}, got: ${got[i]}, expected: ${expected[i]}}`
      );
      return false;
    }
  }
  return true;
}

async function testImage(name: string) {
  const qoiPath = path.join(__dirname, "../qoi_test_images", `${name}.qoi`);
  const originalQoiBytes = new Uint8Array(await fs.readFile(qoiPath));
  const qoiImage = decode(originalQoiBytes);
  const qoiBytes = encode(qoiImage);
  expect(compareBytes(qoiBytes, originalQoiBytes)).toBe(true);
}

describe("qoi", () => {
  test("dice", async () => {
    await testImage("dice");
  });
  test("kodim10", async () => {
    await testImage("kodim10");
  });
  test("kodim23", async () => {
    await testImage("kodim23");
  });
  test("qoi_logo", async () => {
    await testImage("qoi_logo");
  });
  test("testcard_rgba", async () => {
    await testImage("testcard_rgba");
  });
  test("testcard", async () => {
    await testImage("testcard");
  });
  test("wikipedia_008", async () => {
    await testImage("wikipedia_008");
  });
});
