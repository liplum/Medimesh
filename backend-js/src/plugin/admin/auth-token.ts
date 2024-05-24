import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import { v4 as uuidv4 } from "uuid"
import { AdminPluginType } from "./admin.js"
import { createLogger } from "@liplum/log"

interface AdminAuthTokenPluginConfig {
  /**
   * The authentication token.
   * A uuid v4 will be generated by default.
   */
  token?: string

  /**
   * The cookie path used for authentication.
   * "meditree.Admin.AuthToken" by default.
   */
  cookiePath?: string
}

const AdminAuthTokenPlugin: PluginMeta<MeditreePlugin, AdminAuthTokenPluginConfig> = {
  create(config) {
    const log = createLogger("Admin")
    const token = config.token ?? (() => {
      const token = uuidv4()
      log.warn(`No authentication token configured. A random token was generated: "${token}".`)
      return token
    })()
    const cookiePath = config.cookiePath ?? "meditree.Admin.AuthToken"
    return {
      setupService: (container) => {
        container.bind(AdminPluginType.Auth).toValue((req, res, next) => {
          const theirToken = req.cookies[cookiePath]
          if (theirToken === token) {
            next()
          } else {
            res.status(401).send("Auth Error").end()
          }
        })
      },
    }
  }
}
export default AdminAuthTokenPlugin