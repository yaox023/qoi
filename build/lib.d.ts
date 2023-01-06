export declare type QOIFile = {
    width: number;
    height: number;
    channels: number;
    colorspace: number;
    pixels: Uint8Array;
};
export declare const encode: (qoiFile: QOIFile) => Uint8Array;
export declare const decode: (qoiBytes: Uint8Array) => QOIFile;
