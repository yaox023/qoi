## qoi

A QOI image encoder and decoder.

## Usage

First, A FOIFile type is defined with sturcture as below.

```typescript
export declare type QOIFile = {
    width: number;
    height: number;
    channels: number;
    colorspace: number;
    pixels: Uint8Array;
};
```

Then the encode function accept the raw binary data(rgba or rgb) and returns the QOI image binary data.

```typescript
export declare const encode: (qoiFile: QOIFile) => Uint8Array;
```

Lastly, a decode function is provded for decoding QOI image data into raw binary data.

```typescript
export declare const decode: (qoiBytes: Uint8Array) => QOIFile;
```

See `index.html` file for details.

## Steps

1. Install

```
$ npm install
```

2. Build

```
$ npm run build
```

3. Test

```
$ npm test
```

## References

- [The Quite OK Image Format](https://qoiformat.org/)
