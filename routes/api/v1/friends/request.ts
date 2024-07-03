import { getCookies } from "$std/http/cookie.ts"
import csrftoken from "../../../../models/csrftoken.ts"
import Friends from "../../../../models/friends.ts"
import requestAddFriend from "../../../../models/reqestAddFriend.ts"
import Users from "../../../../models/users.ts"
import rooms from "../../../../models/rooms.ts"
import users from "../../../../models/users.ts"
import takostoken from "../../../../models/takostoken.ts"
import { load } from "$std/dotenv/mod.ts"
import { crypto } from "$std/crypto/mod.ts"
import { takosfetch } from "../../../../util/takosfetch.ts"
import App from "../../../_app.tsx"
import friends from "../../../../models/friends.ts"
const env = await load()
export const handler = {
  async POST(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      })
    }

    const data = await req.json()
    const cookies = getCookies(req.headers)

    if (typeof data.csrftoken !== "string") {
      return new Response(JSON.stringify({ status: "error" }), {
        headers: { "Content-Type": "application/json" },
        status: 403,
      })
    }

    const csrfTokenRecord = await csrftoken.findOne({
      token: data.csrftoken,
      sessionID: cookies.sessionid,
    })
    if (
      !csrfTokenRecord || csrfTokenRecord.sessionID !== cookies.sessionid
    ) {
      return new Response(JSON.stringify({ status: "error" }), {
        headers: { "Content-Type": "application/json" },
        status: 403,
      })
    }

    await csrftoken.deleteOne({ token: data.csrftoken })
    const userid = ctx.state.data.userid
    if (data.type === "rejectRequest") {
      const { friendName } = data
      const friendInfo = await Users.findOne({ userName: friendName.replace("@" + env["serverDomain"], "") }) // Assuming 'userName' is a valid field in the 'users' object
      if (!friendInfo) {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        })
      }
      const isRequested = await requestAddFriend.findOne({
        userID: userid,
      })
      if (!isRequested) {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        })
      }
      const isRequestedFriend = isRequested.Applicant.some(
        (applicant: any) => applicant.userID === friendInfo.uuid,
      )
      if (!isRequestedFriend) {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        })
      }
      await requestAddFriend.updateOne(
        { userID: userid },
        { $pull: { Applicant: { userID: friendInfo.uuid } } },
      )
      return new Response(JSON.stringify({ status: "success" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }
    if (data.type === "acceptRequest") {
      const { friendName } = data
      const splitFriendName = splitUserName(friendName)
      if (
        !splitFriendName ||
        splitFriendName.domain !== env["serverDomain"]
      ) {
        const ApplientedUserInfo = await requestAddFriend.findOne({
          userID: ctx.state.data.userid,
        })
        if (!ApplientedUserInfo) {
          return new Response(JSON.stringify({ status: "error" }), {
            headers: { "Content-Type": "application/json" },
            status: 403,
          })
        }
        const isRequested = ApplientedUserInfo.Applicant.some(
          (applicant: any) =>
            applicant.userName ===
              splitUserName(friendName)?.name &&
            applicant.host === splitUserName(friendName)?.domain,
        )
        if (!isRequested) {
          return new Response(JSON.stringify({ status: "error" }), {
            headers: { "Content-Type": "application/json" },
            status: 403,
          })
        }
        //ランダムな文字列を生成
        const takosTokenArray = new Uint8Array(16)
        const randomarray = crypto.getRandomValues(takosTokenArray)
        const takosToken = Array.from(
          randomarray,
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("")
        takostoken.create({
          token: takosToken,
          origin: splitFriendName?.domain,
        })
        const requestResult = await takosfetch(
          `${splitFriendName?.domain}/api/v1/server/friends/request`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requesterUserName: ctx.state.data.userName + "@" +
                env["serverDomain"],
              requesterUserUUID: ctx.state.data.userid,
              requirement: "acceptReqFriend",
              recipientUserName: friendName,
              token: takosToken,
            }),
          },
        )
        if (!requestResult) {
          return new Response(JSON.stringify({ status: "error" }), {
            headers: { "Content-Type": "application/json" },
            status: 403,
          })
        }
        if (requestResult.status !== 200) {
          return new Response(JSON.stringify({ status: "error" }), {
            headers: { "Content-Type": "application/json" },
            status: 403,
          })
        }
        const requestResultJson = await requestResult.json()
        if (requestResultJson.status !== true) {
          return new Response(JSON.stringify({ status: "error" }), {
            headers: { "Content-Type": "application/json" },
            status: 403,
          })
        }
        const { roomID, friendUUID } = requestResultJson
        await requestAddFriend.updateOne(
          { userID: userid },
          {
            $pull: {
              Applicant: { userName: splitFriendName?.name },
            },
          },
        )
        const result1 = await rooms.create({
          uuid: roomID,
          users: [
            {
              username: ctx.state.data.userName,
              userid: userid,
              host: env["serverDomain"],
              type: "local",
              domain: env["serverDomain"],
            },
            {
              username: splitFriendName?.name,
              userid: friendUUID,
              host: splitFriendName?.domain,
              type: "other",
              domain: splitFriendName?.domain,
            },
          ],
          messages: [],
          types: "remotefriend",
          latestmessage: "",
          latestMessageTime: Date.now(),
        })
        const isAlreadyCreateFriendTable = await Friends.findOne({
          user: userid,
        })
        if (!isAlreadyCreateFriendTable) {
          await Friends.create({ user: userid })
        }
        const result2 = await friends.updateOne(
          { user: userid },
          {
            $push: {
              friends: {
                userid: friendUUID,
                room: roomID,
                type: "other",
              },
            },
          },
        )
        return new Response(JSON.stringify({ status: "success" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        })
      }
      const friendInfo = await Users.findOne({
        userName: splitFriendName?.name,
      })
      if (!friendInfo) {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        })
      }
      const isRequested = await requestAddFriend.findOne({
        userID: userid,
      })
      if (!isRequested) {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        })
      }
      const isRequestedFriend = isRequested.Applicant.some(
        (applicant: any) => applicant.userID === friendInfo.uuid,
      )
      if (!isRequestedFriend) {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        })
      }
      const isAlreadyCreateFriendTable = await Friends.findOne({
        user: userid,
      })
      if (!isAlreadyCreateFriendTable) {
        await Friends.create({ user: userid })
      }
      if (
        (await Friends.updateOne({ user: userid }, {
          $push: { friends: { userid: friendInfo.uuid } },
        })).matchedCount === 0
      ) {
        await Friends.create({
          user: userid,
          friends: [{ userid: friendInfo.uuid }],
        })
      }
      if (
        (await Friends.updateOne({ user: friendInfo.uuid }, {
          $push: { friends: { userid } },
        })).matchedCount === 0
      ) {
        await Friends.create({
          user: friendInfo.uuid,
          friends: [{ userid }],
        })
      }
      await requestAddFriend.updateOne(
        { userID: userid },
        { $pull: { Applicant: { userID: friendInfo.uuid } } },
      )
      await requestAddFriend.updateOne(
        { userID: friendInfo.uuid },
        { $pull: { AppliedUser: { userID: userid } } },
      )
      //乱数でroomIDを生成
      let isCreatedRoom = false
      let roomID = ""
      while (!isCreatedRoom) {
        roomID = Math.random().toString(32).substring(2)
        const room = await rooms.findOne({ uuid: roomID })
        if (!room) {
          await rooms.create({
            uuid: roomID,
            users: [
              {
                username: userid,
                userid: userid,
                host: "local",
                type: "local",
                domain: env["serverDomain"],
              },
              {
                username: friendInfo.userName,
                userid: friendInfo.uuid,
                host: "local",
                type: "local",
                domain: "local",
              },
            ],
            messages: [],
            types: "friend",
            latestmessage: "",
            latestMessageTime: Date.now(),
          })
          isCreatedRoom = true
        }
      }
      await users.updateOne(
        { uuid: userid },
        { $push: { rooms: roomID } },
      )
      await users.updateOne(
        { uuid: friendInfo.uuid },
        { $push: { rooms: roomID } },
      )
      return new Response(JSON.stringify({ status: "success" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }
    // only local user can add friend by key
    if (data.type === "AddFriendKey") {
      const { addFriendKey } = data
      const addFriendUserInfo = await Users.findOne({
        addFriendKey: addFriendKey,
      })
      if (!addFriendKey || !addFriendUserInfo) {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        })
      }

      const friendsInfo = await Friends.findOne({ user: userid })

      if (!friendsInfo) {
        await Friends.create({ user: userid })
      }

      const existingRequest = await requestAddFriend.findOne({
        userID: addFriendUserInfo.uuid,
      })
      const ApplcienterInfo = await Users.findOne({ uuid: userid })
      if (!ApplcienterInfo) {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        })
      }
      if (!existingRequest) {
        await requestAddFriend.create({
          userID: addFriendUserInfo.uuid,
          Applicant: [{
            userID: userid,
            userName: ApplcienterInfo.userName,
            host: env["serverDomain"],
            type: "local",
          }],
        })
        await requestAddFriend.create({
          userID: userid,
          Applicant: [],
          AppliedUser: [{
            userID: addFriendUserInfo.uuid,
            userName: addFriendUserInfo.userName,
            host: env["serverDomain"],
            type: "local",
          }],
        })
      } else {
        const isAlreadySentReq = existingRequest.Applicant.some(
          (applicant: any) => applicant.userID === userid,
        )

        if (!isAlreadySentReq) {
          await requestAddFriend.updateOne(
            { userID: addFriendUserInfo.uuid },
            {
              $push: {
                Applicant: { userID: userid },
                AppliedUser: { userID: addFriendUserInfo.uuid },
              },
            },
          )
        }
      }

      return new Response(JSON.stringify({ status: "success" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    } else if (data.type === "userName") {
      //const userName = ctx.state.data.userName
      const friendName = data.friendName
      if (!friendName) {
        console.log("friendName is not defined")
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        })
      }
      const friendDomain = splitUserName(friendName)?.domain
      if (!friendDomain) {
        console.log("friendDomain is not defined")
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        })
      }
      try {
        if (friendDomain == env["serverDomain"]) {
          const friendInfo = await users.findOne({
            userName: splitUserName(friendName)?.name,
          })
          if (!friendInfo) {
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 404,
              },
            )
          }
          if (friendInfo.uuid === userid) {
            console.log("friendInfo.uuid === userid")
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            )
          }
          const myFriendInfo = await Friends.findOne({ user: userid })
          if (!myFriendInfo) {
            await Friends.create({ user: userid })
          }
          const isAlredyFriend = myFriendInfo?.friends.some((
            friend: any,
          ) => friend.userid === friendInfo.uuid)
          if (isAlredyFriend) {
            console.log("isAlredyFriend")
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            )
          }
          const isAlredyRequest = await requestAddFriend.findOne({
            userID: userid,
          })
          if (isAlredyRequest == null) {
            await requestAddFriend.create({ userID: userid })
          }
          const isAlredyRequested = isAlredyRequest?.Applicant.some((
            applicant: any,
          ) => applicant.userID === friendInfo.uuid)
          if (isAlredyRequested) {
            console.log("isAlredyRequested")
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            )
          }
          const userFriendInfo = await requestAddFriend.findOne({
            userID: friendInfo.uuid,
          })
          if (userFriendInfo === null) {
            await requestAddFriend.create({
              userID: friendInfo.uuid,
            })
          }
          await requestAddFriend.updateOne(
            { userID: friendInfo.uuid },
            {
              $push: {
                Applicant: {
                  userID: userid,
                  type: "local",
                  timestamp: Date.now(),
                },
              },
            },
          )
          await requestAddFriend.updateOne(
            { userID: userid },
            {
              $push: {
                AppliedUser: {
                  userID: friendInfo.uuid,
                  type: "local",
                  timestamp: Date.now(),
                },
              },
            },
          )

          return new Response(JSON.stringify({ status: "success" }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          })
        } else {
          //外部サーバーにリクエストを送る
          const serverDomain = splitUserName(friendName)?.domain
          const myFriendInfo = await Friends.findOne({ user: userid })
          if (myFriendInfo == null) {
            await Friends.create({ user: userid })
          }
          const frienduuidres = await takosfetch(
            `${serverDomain}/api/v1/server/users/${friendName}/uuid`,
          )
          if (!frienduuidres) {
            console.log("frienduuidres is null")
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            )
          }
          if (frienduuidres.status !== 200) {
            console.log("frienduuidres is not 200")
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            )
          }
          const frienduuid = (await frienduuidres.json()).uuid
          const isAlredyFriend = myFriendInfo?.friends.some((
            friend: any,
          ) => friend.userid === frienduuid)
          if (isAlredyFriend) {
            console.log("isAlredyFriend")
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            )
          }
          const isAlredyRequest = await requestAddFriend.findOne({
            userID: userid,
          })
          if (isAlredyRequest == null) {
            await requestAddFriend.create({ userID: userid })
          }
          const isAlredyRequested = isAlredyRequest?.Applicant.some((
            applicant: any,
          ) => applicant.userID === friendName)
          if (isAlredyRequested) {
            console.log("isAlredyRequested")
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            )
          }
          const takosToken = crypto.randomUUID()
          takostoken.create({
            token: takosToken,
            origin: serverDomain,
          })
          const requestResult = await takosfetch(
            `${serverDomain}/api/v1/server/friends/request`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                requesterUserName: ctx.state.data.userName +
                  "@" +
                  env["serverDomain"],
                requesterUserUUID: ctx.state.data.userid,
                requirement: "reqFriend",
                recipientUserName: friendName,
                token: takosToken,
              }),
            },
          )
          if (!requestResult) {
            console.log("requestResult is null")
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            )
          }
          if (requestResult.status === 200) {
            //ApplicantedUserに追加
            await requestAddFriend.updateOne(
              { userID: userid },
              {
                $push: {
                  AppliedUser: {
                    userID: "unkonwn",
                    userName: splitUserName(friendName)
                      ?.name,
                    host: splitUserName(friendName)?.domain,
                    type: "other",
                    timestamp: Date.now(),
                  },
                },
              },
            )
            return new Response(
              JSON.stringify({ status: "success" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 200,
              },
            )
          } else {
            console.log(console.log(requestResult))
            return new Response(
              JSON.stringify({ status: "error" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 400,
              },
            )
          }
        }
      } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 500,
        })
      }
    }

    return new Response(JSON.stringify({ status: "error" }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  },
}
function splitUserName(name: string) {
  const parts = name.split("@")
  if (parts.length === 2) {
    return { name: parts[0], domain: parts[1] }
  } else {
    return null
  }
}
