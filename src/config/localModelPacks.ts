export interface LocalModelPack {
  id: string;
  name: string;
  fileName: string;
  downloadUrl: string;
  sizeBytes: number;
  sha256?: string;
  format: 'gguf';
  quantization?: string;
  recommendedRamGb: number;
  contextTokens: number;
  temperature: number;
  maxTokens: number;
  description: string;
}

export const LOCAL_MODEL_PACKS: LocalModelPack[] = [
  {
    id: 'primary-local-pack',
    name: 'Primary Local Model',
    fileName: 'your-model.gguf',
    downloadUrl: '',
    sizeBytes: 0,
    sha256: '',
    format: 'gguf',
    quantization: 'Q4_K_M',
    recommendedRamGb: 8,
    contextTokens: 2048,
    temperature: 0.7,
    maxTokens: 512,
    description: 'Replace this entry with your chosen mobile GGUF model pack.',
  },
];

export const PRIMARY_LOCAL_MODEL_PACK = LOCAL_MODEL_PACKS[0];

export function isLocalPackConfigured(pack: LocalModelPack): boolean {
  return Boolean(pack.downloadUrl && pack.fileName && pack.sizeBytes > 0);
}
