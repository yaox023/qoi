const QOI_MAGIC = 0x716f6966;

const QOI_HEADER_SIZE = 14;
const QOI_END_MARKER = [0, 0, 0, 0, 0, 0, 0, 1];

const QOI_TAG_MASK = 0xc0; // 11xxxxxx

const QOI_OP_INDEX_TAG = 0x00; // 00000000
const QOI_OP_INDEX_MASK = 0x3f; // 00111111

const QOI_OP_DIFF_TAG = 0x40; // 01000000
const QOI_OP_DIFF_DR_MASK = 0x30; // 00110000
const QOI_OP_DIFF_DG_MASK = 0x0c; // 00001100
const QOI_OP_DIFF_DB_MASK = 0x03; // 00000011
const QOI_OP_DIFF_BIAS = 2;

const QOI_OP_LUMA_TAG = 0x80; // 10000000
const QOI_OP_LUMA_DG_MASK = 0x3f; // 00111111
const QOI_OP_LUMA_G_BIAS = 32;
const QOI_OP_LUMA_DRDG_MASK = 0xf0; // 11110000
const QOI_OP_LUMA_DBDG_MASK = 0x0f; // 00001111
const QOI_OP_LUMA_RB_BIAS = 8;

const QOI_OP_RUN_TAG = 0xc0; // 11000000
const QOI_OP_RUN_MASK = 0x3f; // 00111111
const QOI_OP_RUN_BIAS = -1;

const QOI_OP_RGB_TAG = 0xfe; // 11111110
const QOI_OP_RGBA_TAG = 0xff; // 11111111

const INIT_PIXEL = [0, 0, 0, 255];

export type QOIFile = {
  width: number;
  height: number;
  channels: number;
  colorspace: number;
  pixels: Uint8Array;
};

const isEqual = (cur: Uint8Array, pre: Uint8Array): boolean => {
  return (
    cur[0] === pre[0] &&
    cur[1] === pre[1] &&
    cur[2] === pre[2] &&
    cur[3] === pre[3]
  );
};

function initSeenPixels() {
  return Array.from({ length: 64 }, () => new Uint8Array(4));
}

const hash = (pixel: Uint8Array) =>
  (pixel[0] * 3 + pixel[1] * 5 + pixel[2] * 7 + pixel[3] * 11) % 64;

export const encode = (qoiFile: QOIFile): Uint8Array => {
  const pixelBytes = qoiFile.pixels;
  let readIndex = 0;
  const readByte = () => {
    return pixelBytes[readIndex++];
  };

  const prevPixel = new Uint8Array(INIT_PIXEL);
  const curPixel = new Uint8Array(INIT_PIXEL);
  // prettier-ignore
  const updatePixel = () => {
    prevPixel[0] = curPixel[0];
    prevPixel[1] = curPixel[1];
    prevPixel[2] = curPixel[2];
    prevPixel[3] = curPixel[3];
  };

  const qoiBytes = new Uint8Array(pixelBytes.byteLength);
  let writeIndex = 0;
  const write32 = (value: number) => {
    qoiBytes[writeIndex++] = (value & 0xff000000) >> 24;
    qoiBytes[writeIndex++] = (value & 0x00ff0000) >> 16;
    qoiBytes[writeIndex++] = (value & 0x0000ff00) >> 8;
    qoiBytes[writeIndex++] = (value & 0x000000ff) >> 0;
  };
  const writeByte = (value: number) => {
    qoiBytes[writeIndex++] = value;
  };

  let runLength = 0;
  const writeOpRun = () => {
    writeByte(QOI_OP_RUN_TAG | (runLength + QOI_OP_RUN_BIAS));
    runLength = 0;
  };

  const seenPixels = initSeenPixels();
  let seenIndex = 0;
  const insertIntoSeenPixels = () => {
    seenPixels[seenIndex][0] = curPixel[0];
    seenPixels[seenIndex][1] = curPixel[1];
    seenPixels[seenIndex][2] = curPixel[2];
    seenPixels[seenIndex][3] = curPixel[3];
  };
  const writeOpIndex = () => {
    writeByte(QOI_OP_INDEX_TAG | seenIndex);
  };

  let diff = [0, 0, 0, 0];
  const wraparound = (n: number) =>
    n & 0b10000000 ? (n - 256) % 256 : (n + 256) % 256;

  let drdg = 0;
  let dbdg = 0;
  const calculateDiff = () => {
    diff[0] = curPixel[0] - prevPixel[0];
    diff[0] = wraparound(diff[0]);

    diff[1] = curPixel[1] - prevPixel[1];
    diff[1] = wraparound(diff[1]);

    diff[2] = curPixel[2] - prevPixel[2];
    diff[2] = wraparound(diff[2]);

    diff[3] = curPixel[3] - prevPixel[3];
    diff[3] = wraparound(diff[3]);

    drdg = diff[0] - diff[1];
    dbdg = diff[2] - diff[1];
  };
  const writeOpDiff = () => {
    writeByte(
      QOI_OP_DIFF_TAG |
        ((diff[0] + QOI_OP_DIFF_BIAS) << 4) |
        ((diff[1] + QOI_OP_DIFF_BIAS) << 2) |
        (diff[2] + QOI_OP_DIFF_BIAS)
    );
  };
  const writeOpLuma = () => {
    writeByte(QOI_OP_LUMA_TAG | (diff[1] + QOI_OP_LUMA_G_BIAS));
    writeByte(
      ((drdg + QOI_OP_LUMA_RB_BIAS) << 4) | (dbdg + QOI_OP_LUMA_RB_BIAS)
    );
  };

  const writeOpRGBA = () => {
    writeByte(QOI_OP_RGBA_TAG);
    writeByte(curPixel[0]);
    writeByte(curPixel[1]);
    writeByte(curPixel[2]);
    writeByte(curPixel[3]);
  };
  const writeOpRGB = () => {
    writeByte(QOI_OP_RGB_TAG);
    writeByte(curPixel[0]);
    writeByte(curPixel[1]);
    writeByte(curPixel[2]);
  };

  write32(QOI_MAGIC);
  write32(qoiFile.width);
  write32(qoiFile.height);
  writeByte(qoiFile.channels);
  writeByte(qoiFile.colorspace);

  while (readIndex < pixelBytes.byteLength) {
    updatePixel();

    curPixel[0] = readByte();
    curPixel[1] = readByte();
    curPixel[2] = readByte();
    if (qoiFile.channels === 4) {
      curPixel[3] = readByte();
    }

    if (isEqual(curPixel, prevPixel)) {
      runLength++;
      if (runLength === 62 || readIndex >= pixelBytes.byteLength) {
        writeOpRun();
      }
      continue;
    }

    if (runLength > 0) {
      writeOpRun();
    }

    seenIndex = hash(curPixel);
    if (isEqual(curPixel, seenPixels[seenIndex])) {
      writeOpIndex();
      continue;
    }

    insertIntoSeenPixels();
    calculateDiff();
    if (diff[3] !== 0) {
      writeOpRGBA();
      continue;
    }

    if (
      diff[0] >= -2 &&
      diff[0] <= 1 &&
      diff[1] >= -2 &&
      diff[1] <= 1 &&
      diff[2] >= -2 &&
      diff[2] <= 1
    ) {
      writeOpDiff();
      continue;
    }

    if (
      diff[1] >= -32 &&
      diff[1] <= 31 &&
      drdg >= -8 &&
      drdg <= 7 &&
      dbdg >= -8 &&
      dbdg <= 7
    ) {
      writeOpLuma();
      continue;
    }

    writeOpRGB();
  }

  for (let i = 0; i < QOI_END_MARKER.length; i++) {
    writeByte(QOI_END_MARKER[i]);
  }

  return qoiBytes.slice(0, writeIndex);
};

export const decode = (qoiBytes: Uint8Array): QOIFile => {
  const prevPixel = new Uint8Array(INIT_PIXEL);

  const seenPixels = initSeenPixels();
  const insertIntoSeenPixels = () => {
    const index = hash(prevPixel);
    seenPixels[index][0] = prevPixel[0];
    seenPixels[index][1] = prevPixel[1];
    seenPixels[index][2] = prevPixel[2];
    seenPixels[index][3] = prevPixel[3];
  };

  let readIndex = 0;
  const read32 = () => {
    return (
      (qoiBytes[readIndex++] << 24) |
      (qoiBytes[readIndex++] << 16) |
      (qoiBytes[readIndex++] << 8) |
      qoiBytes[readIndex++]
    );
  };
  const readByte = () => qoiBytes[readIndex++];

  if (qoiBytes.byteLength < QOI_HEADER_SIZE + QOI_END_MARKER.length) {
    throw new Error("invalid file");
  }

  if (read32() !== QOI_MAGIC) {
    throw new Error("invalid file");
  }

  const width = read32();
  const height = read32();
  const channels = readByte();
  const colorspace = readByte();

  const pixelBytes = new Uint8Array(width * height * channels);
  let writeIndex = 0;
  const writePixel = () => {
    pixelBytes[writeIndex++] = prevPixel[0];
    pixelBytes[writeIndex++] = prevPixel[1];
    pixelBytes[writeIndex++] = prevPixel[2];
    if (channels === 4) {
      pixelBytes[writeIndex++] = prevPixel[3];
    }
  };

  const isStreamEnd = (): boolean => {
    if (readIndex + 7 >= qoiBytes.length) {
      throw new Error("invalid qoi image, no end marker");
    }
    for (let i = 0; i < QOI_END_MARKER.length; i++) {
      if (qoiBytes[readIndex + i] !== QOI_END_MARKER[i]) return false;
    }
    return true;
  };

  while (readIndex < qoiBytes.byteLength) {
    if (isStreamEnd()) break;

    const byte = readByte();

    switch (byte) {
      case QOI_OP_RGB_TAG: {
        prevPixel[0] = readByte();
        prevPixel[1] = readByte();
        prevPixel[2] = readByte();
        writePixel();
        insertIntoSeenPixels();
        break;
      }
      case QOI_OP_RGBA_TAG: {
        prevPixel[0] = readByte();
        prevPixel[1] = readByte();
        prevPixel[2] = readByte();
        prevPixel[3] = readByte();
        writePixel();
        insertIntoSeenPixels();
        break;
      }
      default: {
        switch (byte & QOI_TAG_MASK) {
          case QOI_OP_RUN_TAG: {
            const runLength = (byte & QOI_OP_RUN_MASK) - QOI_OP_RUN_BIAS;
            for (let i = 0; i < runLength; i++) {
              writePixel();
            }
            break;
          }
          case QOI_OP_INDEX_TAG: {
            const index = byte & QOI_OP_INDEX_MASK;
            prevPixel[0] = seenPixels[index][0];
            prevPixel[1] = seenPixels[index][1];
            prevPixel[2] = seenPixels[index][2];
            prevPixel[3] = seenPixels[index][3];
            writePixel();
            break;
          }
          case QOI_OP_DIFF_TAG: {
            const dr = ((byte & QOI_OP_DIFF_DR_MASK) >> 4) - QOI_OP_DIFF_BIAS;
            const dg = ((byte & QOI_OP_DIFF_DG_MASK) >> 2) - QOI_OP_DIFF_BIAS;
            const db = ((byte & QOI_OP_DIFF_DB_MASK) >> 0) - QOI_OP_DIFF_BIAS;
            prevPixel[0] += dr;
            prevPixel[1] += dg;
            prevPixel[2] += db;
            writePixel();
            insertIntoSeenPixels();
            break;
          }
          case QOI_OP_LUMA_TAG: {
            const dg = (byte & QOI_OP_LUMA_DG_MASK) - QOI_OP_LUMA_G_BIAS;

            const nextByte = readByte();
            const drdg =
              ((nextByte & QOI_OP_LUMA_DRDG_MASK) >> 4) - QOI_OP_LUMA_RB_BIAS;
            const dbdg =
              ((nextByte & QOI_OP_LUMA_DBDG_MASK) >> 0) - QOI_OP_LUMA_RB_BIAS;

            prevPixel[0] += drdg + dg;
            prevPixel[1] += dg;
            prevPixel[2] += dbdg + dg;
            writePixel();
            insertIntoSeenPixels();
            break;
          }
        }
      }
    }
  }

  return {
    width,
    height,
    channels,
    colorspace,
    pixels: pixelBytes,
  };
};
