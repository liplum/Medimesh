import { token } from "@liplum/ioc"
import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import { v4 as uuidv4 } from "uuid"
import { RequestHandler } from "express"

interface AdminPluginConfig {
  /**
   * The authentication token.
   * A uuid v4 will be generated by default.
   */
  auth?: string
}

export const AdminPluginType = {
  Auth: token<RequestHandler>("net.liplum.Admin.Auth"),
}
const AdminPlugin: PluginMeta<MeditreePlugin, AdminPluginConfig> = {
  create(config) {
    const auth = config.auth ?? uuidv4()
    return {
      setupMeditree: async ({ app, manager, container, service }) => {

      },
    }
  }
}
export default AdminPlugin
