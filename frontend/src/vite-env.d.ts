/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENABLE_VOICE_INPUT: string;
  readonly VITE_ENABLE_AI_EDITING: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}