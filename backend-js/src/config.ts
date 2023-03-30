import fs from "fs"
import path from "path"
import nacl from "tweetnacl"
import { v4 as uuidv4 } from "uuid"

export enum FileType {
  video = "video",
  image = "image",
  audio = "audio",
  text = "text",
}

export interface AppConfig {
  /** 
   * The network interface on which the application will listen for incoming connections.
   * Default is for all interfaces.
   */
  hostname?: string
  /** 
   * Default is 80.
   */
  port: number
  /**
   * The root directory to host.
   * Default is ".".
   */
  root: string
  /**
   * The unique name of hosted file tree.
   * If not specified, a uuid v4 will be generated.
   */
  name: string
  /**
   * If set, requests need passcode in authentication headers, body or cookies.
   */
  passcode?: string
  rebuildInterval: number
  fileTypePattern: Record<string, string>
  fileType: Record<string, FileType>
  ignore?: string[]
  [key: string]: any
}

const defaultConfig: Partial<AppConfig> = {
  root: ".",
  port: 80,
  rebuildInterval: 3000,
  fileType: {
    "video/mp4": FileType.video,
    "image/png": FileType.image,
    "image/jpeg": FileType.image,
    "image/svg+xml": FileType.image,
    "image/gif": FileType.image,
    "image/webp": FileType.image,
    "audio/mpeg": FileType.audio,
    "text/markdown": FileType.text,
    "text/plain": FileType.text,
  },
  fileTypePattern: {
    "**/*.mp4": "video/mp4",
    "**/*.svg": "image/svg+xml",
    "**/*.png": "image/png",
    "**/*.+(jpeg|jpg)": "image/jpeg",
    "**/*.mp3": "audio/mpeg",
    "**/*.md": "text/markdown",
    "**/*.txt": "text/plain",
    "**/*.gif": "image/gif",
    "**/*.webp": "image/webp",
  },
}

// default to ignore application on macOS
if (process.platform === "darwin") {
  defaultConfig.ignore = [
    "**/*.app",
    "**/*.DS_Store"
  ]
}

function setupConfig(config: AppConfig | Partial<AppConfig>): AppConfig {
  config = Object.assign({}, config, defaultConfig)
  if (config.privateKey) {
    if (!config.publicKey) {
      config.publicKey = Buffer.from(nacl.box.keyPair.fromSecretKey(config.privateKey).publicKey).toString("base64")
    }
  } else if (!config.publicKey) {
    const { publicKey, secretKey } = nacl.box.keyPair()
    config.publicKey = Buffer.from(publicKey).toString("base64")
    config.privateKey = Buffer.from(secretKey).toString("base64")
  }
  if (!config.name) {
    config.name = uuidv4()
  }
  return config as AppConfig
}

export function findConfig({ rootDir, filename }: { rootDir: string, filename: string }): AppConfig {
  const curDir = rootDir
  let configFile = findFsEntryInTree(curDir, filename)
  if (configFile) {
    const config = Object.assign({}, defaultConfig, JSON.parse(fs.readFileSync(configFile).toString()))
    setupConfig(config)
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    return config
  } else {
    configFile = path.join(curDir, filename)
    fs.writeFileSync(configFile, JSON.stringify(setupConfig({}), null, 2))
    throw new Error(`Configuration not found. ${configFile} is created.`)
  }
}

function findFsEntryInTree(dir: string, fileName: string): string | null {
  let lastDir: string | null = null
  while (dir !== lastDir) {
    const configFile = path.join(dir, fileName)
    if (fs.existsSync(configFile)) {
      return configFile
    } else {
      lastDir = dir
      dir = path.dirname(dir)
    }
  }
  return null
}
