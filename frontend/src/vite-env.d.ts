/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_WEB_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
