export type CodeType = 'qr' | 'code128' | 'ean13';
export type LabelSize = '4x2' | '2x1' | '3x1';
export type BarcodeItemType = 'sku' | 'location' | 'task';

export interface BarcodeItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: BarcodeItemType;
  metadata?: any;
}

export interface BarcodeOptions {
  codeType: CodeType;
  labelSize: LabelSize;
  includeName: boolean;
  includeDescription: boolean;
  includeCompanyLogo: boolean;
  companyName: string;
}

export interface LabelDimensions {
  width: number;
  height: number;
}

export interface BarcodeGenerationRequest {
  items: BarcodeItem[];
  options: BarcodeOptions;
}

export interface BarcodeGenerationResponse {
  success: boolean;
  message?: string;
  pdfData?: Blob;
  error?: string;
}

export const DEFAULT_BARCODE_OPTIONS: BarcodeOptions = {
  codeType: 'qr',
  labelSize: '4x2',
  includeName: true,
  includeDescription: true,
  includeCompanyLogo: true,
  companyName: 'eSTOCK'
};

export const LABEL_SIZES: Record<LabelSize, LabelDimensions> = {
  '4x2': { width: 288, height: 144 },
  '2x1': { width: 144, height: 72 },
  '3x1': { width: 216, height: 72 }
};
