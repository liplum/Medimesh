/* eslint-disable @typescript-eslint/no-misused-promises */
import { TYPE as MeditreeType, type MeditreePlugin } from "../server.js"
import { v4 as uuidv4 } from "uuid"
import jwt, { type JwtPayload } from "jsonwebtoken"
import { createLogger } from "../logger.js"
import { type Request } from "express"
import { uniqueToken } from "../ioc.js"

export const TYPE = {
  UserStorage: uniqueToken<UserStorageService>("UserStorage"),
}
interface AuthPluginConfig {
  /**
   * "7d" by default.
   */
  jwtExpiration?: number | string
  /**
   * A random uuid v4 by default.
   */
  jwtSecret?: string
  /**
   * No register by default.
   * If given, the register will be used.
   * 
   * Without the built-in registration, an external server for user management can be used.
   */
  register?: RegisterConfig
}

interface RegisterConfig {
  /**
   * "/register" by default.
   */
  path?: string
}

export default function AuthPlugin(config: AuthPluginConfig): MeditreePlugin {
  let storage: UserStorageService
  const log = createLogger("Auth")
  const jwtExpiration = config.jwtExpiration ?? "7d"
  const register = config.register
  const jwtSecret = config.jwtSecret ?? uuidv4()
  return {
    onRegisterService(container) {
      storage = container.get(TYPE.UserStorage)
      container.bind(MeditreeType.Auth).toValue(async (req, res, next) => {
        // Get the JWT from the cookie, body or authorization header in a fallback chain.
        const token = req.cookies.jwt ?? req.body.jwt ?? getJwtFromAuthHeader(req)
        if (!token) {
          res.status(401).send("Token Missing").end()
          return
        }
        // Handle missing token error
        // Verify the JWT using the secret key
        try {
          const jwtPayload = jwt.verify(token, jwtSecret) as JwtPayload
          const account = jwtPayload.account
          if (typeof account !== "string") {
            res.status(401).send("Token Invalid").end()
            return
          }
          if (await storage.getUser(account) === null) {
            res.status(401).send("Token Invalid").end()
            return
          }
          next()
        } catch (error) {
          res.status(401).send("Auth Error").end()
          return
        }
      }
      )
    },
    async onRegisterExpressHandler(app) {
      app.post("/login", async (req, res) => {
        const { account, password } = req.body
        // only finding active staffs
        const user = await storage.getUser(account)
        if (!user || user.password !== password) {
          res.status(401).send("Wrong Credentials")
          return
        }
        // Create JWT token
        const token = jwt.sign({ account }, jwtSecret, {
          expiresIn: jwtExpiration
        })
        // Send token in response and staff info
        return res.json({
          jwt: token,
        })
      })

      if (register) {
        const registerPath = register.path ?? "/register"
        log.info(`User registration hosts on "${registerPath}".`)
        app.post(registerPath, async (req, res) => {
          const { account, password } = req.body
          if (!(typeof account === "string" && typeof password === "string")) {
            res.status(400).send("Credentials Invalid")
            return
          }
          const user = await storage.getUser(account)
          if (user !== null) {
            res.status(400).send("Account Exists")
            return
          }
          await storage.addUser({ account, password })
          res.status(200).send("Account Created")
          return
        })
      }
    }
  }
}

function getJwtFromAuthHeader(req: Request): string | null {
  // Check if Authorization header is present
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return null
  }
  try {
    // Extract token from Authorization header
    const scheme = authHeader.split(" ")
    // Use Bearer authentication scheme
    if (scheme[0] === "Bearer") {
      return scheme[1]
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Represents a user with an account and password.
 */
export interface User {
  account: string
  password: string
}

/**
 * Represents a service to be injected for storing and manipulating users.
 */
export interface UserStorageService {
  /**
   * Adds a new user to the storage.
   * @param user The user to add.
   * @returns `true` if the user was added successfully, `false` otherwise.
   */
  addUser(user: User): Promise<boolean>

  /**
   * Retrieves a user from the storage based on the account name.
   * @param account The account name of the user to retrieve.
   * @returns The retrieved user object or `null` if the user was not found.
   */
  getUser(account: string): Promise<User | null>

  /**
   * Updates an existing user in the storage.
   * @param user The updated user object.
   * @returns `true` if the user was updated successfully, `false` otherwise.
   */
  updateUser(user: User): Promise<boolean>

  /**
   * Deletes a user from the storage based on the account name.
   * @param account The account name of the user to delete.
   * @returns `true` if the user was deleted successfully, `false` otherwise.
   */
  deleteUser(account: string): Promise<boolean>
}
