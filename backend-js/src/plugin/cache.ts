import { LocalFile } from "../file.js"
import { type MeditreePlugin } from "../server.js"
import { type Readable, PassThrough } from "stream"
import fs from "fs"
import path, { join, dirname } from "path"
import { promisify } from "util"
import { hash32Bit } from "../crypt.js"
import { createLogger } from "../logger.js"
import { parseTime } from "../utils.js"

interface CachePluginConfig {
  /**
   * The max file size for being cached.
   * 10MB by default.
   */
  maxSize?: number
  /**
   * The max time in ms to live for the cache.
   * 24 hours by default.
   */
  maxAge?: number | string
  /**
   * The cache root direcotry.
   * "meditree-cache" by default.
   */
  root?: string
}

const fsstate = promisify(fs.stat)
const mkdir = promisify(fs.mkdir)
export default function CachePlugin(config: CachePluginConfig): MeditreePlugin {
  const maxSize = config.maxSize ?? 10 * 1024 * 1024
  const maxAge = parseTime(config.maxAge, "24h")
  const root = config.root ?? "meditree-cache"
  const log = createLogger("Cache")
  log.info(`The cache directory is located at ${path.resolve(root)}.`)

  function getCachePath(nodeName: string, path: string): string {
    return join(root, hash(nodeName), hash(path))
  }

  return {
    async onNodeCreateReadStream(node, file, options?) {
      // ignore local file requests
      if (file.inner instanceof LocalFile) return
      // ignore large files
      if (file.inner.size > maxSize) return
      // for remote file
      if (typeof file.remoteNode === "string") {
        const cachePath = getCachePath(file.remoteNode, file.path)
        // if cached, capable to read partial file
        if (fs.existsSync(cachePath) && (await fsstate(cachePath)).isFile()) {
          return fs.createReadStream(cachePath, options)
        }
        // if not cached, ignore partial file
        if (options) {
          if (options.start !== undefined && options.start !== 0) return
          if (options.end !== undefined && options.end !== file.inner.size - 1) return
        }
        const stream = await node.createReadStream(file)
        if (stream === null) return null
        await mkdir(dirname(cachePath), { recursive: true })
        // clone the incoming stream
        const [forCache, forResponse] = duplicateStream(stream)
        // ensure parent directory exists.
        const cache = fs.createWriteStream(cachePath)
        // write into cache
        forCache.pipe(cache)
        // return a clone
        return forResponse
      }
    }
  }
}

function hash(input: string): string {
  const hashcode = hash32Bit(input)
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(hashcode)
  return buffer.toString("base64url")
}

/**
 * Modified by chatGPT.
 */
function duplicateStream(input: Readable): [Readable, Readable] {
  const stream1 = new PassThrough({ highWaterMark: input.readableHighWaterMark })
  const stream2 = new PassThrough({ highWaterMark: input.readableHighWaterMark })

  input.pipe(stream1)
  input.pipe(stream2)

  function errorHandler(err: any): void {
    stream1.destroy(err)
    stream2.destroy(err)
  }

  input.on("error", errorHandler)
  stream1.on("error", errorHandler)
  stream2.on("error", errorHandler)

  return [stream1, stream2]
}
