/* eslint-disable @typescript-eslint/no-misused-promises */
import { HostTree } from "./host.js"
import { type AppConfig, type AsParentConfig, type AsChildConfig } from "./config.js"
import express, { type Request, type Response } from "express"
import { type ResolvedFile, type FileTree } from "./file.js"
import cors from "cors"
import { setupAsParent, setupAsChild, MeditreeNode, type FileTreeInfo } from "./meditree.js"
import { createLogger } from "./logger.js"
import { buildIndexHtml } from "./page.js"
import expressWs from "express-ws"

export async function startServer(config: AppConfig): Promise<void> {
  console.time("Start Server")
  const homepage = config.homepage
  const app = express()
  app.use(cors())
  app.use(express.json())
  const log = createLogger("Main")
  const localTree = !config.root
    ? undefined
    : new HostTree({
      rootPath: config.root,
      name: config.name,
      fileTypePattern: config.fileType,
      rebuildInterval: config.rebuildInterval,
      ignorePattern: config.ignore ?? [],
    })
  const node = new MeditreeNode()
  const fileTypes = Array.from(Object.values(config.fileType))
  node.subNodeFilter = (file) => {
    return fileTypes.includes(file["*type"])
  }

  if (localTree) {
    localTree.on("rebuild", (fileTree) => {
      node.updateFileTreeFromLocal(config.name, fileTree)
      log.info("Local file tree is rebuilt.")
    })
  }
  let fullTreeCache: { obj: FileTreeInfo, json: string, html?: string }
  updateTreeJsonCache({})

  node.on("file-tree-update", (entireFree) => {
    updateTreeJsonCache(entireFree)
  })

  function updateTreeJsonCache(entireFree: FileTree): void {
    let html: string | undefined
    if (typeof homepage !== "string" && (homepage === undefined || homepage === null || homepage)) {
      html = buildIndexHtml(entireFree)
    }
    const info: FileTreeInfo = {
      name: config.name,
      files: entireFree,
    }
    const infoString = JSON.stringify(info, null, 1)
    fullTreeCache = {
      obj: info,
      json: infoString,
      html,
    }
  }

  node.on("parent-node-change", (parent, isAdded) => {
    if (!isAdded) return
    parent.net.send("file-tree-rebuild", fullTreeCache.obj.files)
  })

  if (localTree) {
    localTree.startWatching()
    await localTree.rebuildFileTree()
  }

  // If node is defined and not empty, subnodes can connect to this.
  if (config.child?.length && config.publicKey && config.privateKey) {
    expressWs(app)
    await setupAsParent(node, config as any as AsParentConfig,
      app as any as expressWs.Application)
  }

  // If central is defined and not empty, it will try connecting to every central.
  if (config.parent?.length && config.publicKey && config.privateKey) {
    await setupAsChild(node, config as any as AsChildConfig)
  }

  // If posscode is enabled.
  if (config.passcode) {
    app.use((req, res, next) => {
      const passcode = decodeURI(req.query.passcode as string) ?? req.body.passcode
      if (passcode !== config.passcode) {
        res.status(401).json({ error: "incorrectPasscode" })
      } else {
        next()
      }
    })
  }

  if (typeof homepage === "string") {
    app.get("/", (req, res) => {
      res.redirect(homepage)
    })
  } else if (homepage === undefined || homepage === null || homepage) {
    app.get("/", (req, res) => {
      res.status(200)
      res.contentType("html")
      res.send(fullTreeCache.html)
    })
  }

  app.get("/list", (req, res) => {
    res.status(200)
    res.contentType("application/json;charset=utf-8")
    res.send(fullTreeCache.json)
  })

  app.get("/file(/*)", async (req, res) => {
    const path = removePrefix(decodeURI(req.baseUrl + req.path), "/file/")
    const file = node.resolveFile(path.split("/"))
    if (file == null) {
      res.status(404).end()
      return
    }
    const fileType = file.inner["*type"]
    if (fileType == null) {
      res.status(404).end()
      return
    }
    res.header({
      "Content-Type": file.type,
    })
    res.setHeader("Cache-Control", `max-age=${config.cacheMaxAge}`)
    await pipeFile(req, res, file)
  })
  /**
   * Ranged is for videos and audios. On Safari mobile, range headers is used.
   */
  async function pipeFile(req: Request, res: Response, file: ResolvedFile): Promise<void> {
    if (file.inner.size !== undefined) {
      let { start, end } = resolveRange(req.headers.range)
      start ??= 0
      end ??= file.size - 1
      const retrievedLength = (end + 1) - start

      res.statusCode = start !== undefined || end !== undefined ? 206 : 200

      res.setHeader("content-length", retrievedLength)
      if (req.headers.range) {
        res.setHeader("content-range", `bytes ${start}-${end}/${file.inner.size}`)
        res.setHeader("accept-ranges", "bytes")
      }
      const stream = await node.createReadStream(file, {
        start, end,
      })
      if (!stream) {
        res.status(404).end()
        return
      }
      stream.on("error", (_) => {
        res.sendStatus(500)
      })
      stream.pipe(res)
    } else {
      const stream = await node.createReadStream(file)
      if (!stream) {
        res.status(404).end()
        return
      }
      stream.on("error", (_) => {
        res.sendStatus(500)
      })
      stream.pipe(res)
    }
  }

  const onRunning = (): void => {
    log.info(`Server running at http://localhost:${config.port}/`)
    console.timeEnd("Start Server")
  }
  if (config.hostname) {
    app.listen(config.port, config.hostname, onRunning)
  } else {
    app.listen(config.port, onRunning)
  }
}

function removePrefix(origin: string, prefix: string): string {
  if (origin.startsWith(prefix)) return origin.substring(prefix.length,)
  else return origin
}

function resolveRange(range?: string): { start?: number, end?: number } {
  if (!range) return {}
  let start: number | undefined
  let end: number | undefined

  if (range.startsWith("bytes=")) {
    const parts = removePrefix(range, "bytes=").split("-")
    if (parts.length === 2) {
      const rangeStart = parts[0]?.trim()
      if (rangeStart && rangeStart.length > 0) {
        start = parseInt(rangeStart)
      }
      const rangeEnd = parts[1]?.trim()
      if (rangeEnd && rangeEnd.length > 0) {
        end = parseInt(rangeEnd)
      }
    }
  }
  return { start, end }
}
