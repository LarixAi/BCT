interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
