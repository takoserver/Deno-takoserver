// books.ts
import { Hono } from "hono"
import ping from "@/v2/client/ping.ts"
import bgimage from "@/v2/client/bgimage.ts"
import temp from "@/v2/client/sessions/registers/temp.ts"
import check from "@/v2/client/sessions/registers/check.ts"
import recaptcha from "@/v2/client/recaptcha.ts"
import auth from "@/v2/client/sessions/registers/auth.ts"
import icon from "@/v2/client/profile/icon.ts"
import userName from "@/v2/client/profile/userName.ts"
import profile from "@/v2/client/profile/profile.ts"
import nickName from "@/v2/client/profile/nickName.ts"
import login from "@/v2/client/sessions/login.ts"
import logout from "@/v2/client/sessions/logout.ts"
import setup from "@/v2/client/sessions/registers/setup.ts"
import keys from "./profile/keys.ts"
import ws from "@/v2/client/ws/ws.ts"
import sessionKey from "@/v2/client/sessions/key.ts"
import friendAccept from "@/v2/client/friends/accept.ts"
import friendRequest from "@/v2/client/friends/request.ts"
import friendsReqList from "@/v2/client/friends/requestList.ts"
import iconUser from "@/v2/client/users/icon.ts"
import list from "@/v2/client/list.ts"
import usersKey from "@/v2/client/users/keys.ts"
import resetKey from "@/v2/client/profile/resetKey.ts"
import talkData from "./talk/data.ts"
import talkSend from "./talk/send.ts"
import talkInfo from "./talk/info.ts"
const app = new Hono()
app.route("/ping", ping)
app.route("/bgimage", bgimage)
app.route("/sessions/registers/temp", temp)
app.route("/sessions/registers/check", check)
app.route("/sessions/registers/auth", auth)
app.route("/recaptcha", recaptcha)
app.route("/profile/icon", icon)
app.route("/profile/userName", userName)
app.route("/profile/nickName", nickName)
app.route("/profile", profile)
app.route("/sessions/login", login)
app.route("/sessions/logout", logout)
app.route("/sessions/registers/setup", setup)
app.route("/profile/keys", keys)
app.route("/ws", ws)
app.route("/sessions/key", sessionKey)
app.route("/friends/accept", friendAccept)
app.route("/friends/request", friendRequest)
app.route("/friends/requestList", friendsReqList)
app.route("/users/icon", iconUser)
app.route("/list", list)
app.route("/users/keys", usersKey)
app.route("/profile/resetKey", resetKey)
app.route("/talk/data", talkData)
app.route("/talk/send", talkSend)
app.route("/talk/info", talkInfo)
export default app
