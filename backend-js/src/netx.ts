/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { BufferWriter } from "./buffer.js"
import { Net, MessageType } from "./net.js"

declare module "./net.js" {
  interface Net {
    sendBubble: (id: string, nodeId: string, arr: any[]) => void
    addBubbleHook: (nodeId: string, handler: (id: string, arr: any[]) => void) => void
  }
}
declare module "./buffer.js" {
  interface BufferWriter {
    strings: (
      writing: (write: (value: string) => void) => void,
      encoding: BufferEncoding
    ) => void
  }
}
Net.prototype.sendBubble = function (id: string, nodeId: string, data: any): void {
  this.send(`[bubble]${id}`, data, [nodeId])
}

Net.prototype.addBubbleHook = function (nodeId: string, handler: (id: string, data: any) => void) {
  this.addReadHook(({ type, id, data, header }: { type: MessageType, id: string, data: any, header?: any }) => {
    if (type !== MessageType.object) return
    if (!id.startsWith("[bubble]")) return
    const nodeIds = header as string[]
    // If nodeIds contains current node, it means the bubble is recursive, so stop the bubbling.
    if (nodeIds.includes(nodeId)) return
    this.send(id, data, [...nodeIds, nodeId])
    handler(removePrefix(id, "[bubble]"), data)
  })
}

function removePrefix(str: string, prefix: string): string {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length)
  }
  return str
}

BufferWriter.prototype.strings = function (
  writing: (write: (value: string) => void) => void,
  encoding: BufferEncoding = "utf8"): void {
  const strings: { value: string, len: number }[] = []
  let totalLength = 0
  writing((value) => {
    const len = Buffer.byteLength(value, encoding)
    totalLength += len
    strings.push({ value, len, })
  })
  this.ensureCapacity(totalLength + 4)
  this.backend.writeInt32BE(totalLength, this.cursor)
  this.cursor += 4
  for (const { value, len } of strings) {
    this.backend.write(value, this.cursor, len, encoding)
    this.cursor += len
  }
}
