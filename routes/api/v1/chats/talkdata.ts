import rooms from "../../../../models/rooms.ts"
import messages from "../../../../models/messages.ts"
import user from "../../../../models/users.ts"
import takostoken from "../../../../models/takostoken.ts"
import pubClient from "../../../../util/redisClient.ts"
import { takosfetch } from "../../../../util/takosfetch.ts"
import { load } from "$std/dotenv/mod.ts"
const env = await load()
const redisch = env["REDIS_CH"]
export const handler = {
  async GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ "status": "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      })
    }
    const requrl = new URL(req.url)
    const roomid = requrl.searchParams.get("roomid")
    if (!roomid) {
      return new Response(
        JSON.stringify({ "status": "Room ID Not Found" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 404,
        },
      )
    }
    //ユーザーがroomidの部屋に参加しているか確認
    const room = await rooms.findOne({
      uuid: roomid,
      users: { $elemMatch: { userid: ctx.state.data.userid } },
    })
    if (!room) {
      return new Response(
        JSON.stringify({ "status": "Room Not Found" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 404,
        },
      )
    }
    const startChat = requrl.searchParams.get("startChat") === "true"
    //Start Chatがtrueの場合、roomidの部屋から最新のメッセージを100件取得
    if (startChat) {
      const room = await rooms.findOne({
        uuid: roomid,
      })
      if (!room) {
        return new Response(
          JSON.stringify({ "status": "Room Not Found" }),
          {
            headers: { "Content-Type": "application/json" },
            status: 404,
          },
        )
      }
      //最近送信されたメッセージを100件取得してreadにuseridを追加
      const RoomMessages = await messages.find({
        roomid: roomid,
      }).sort({ timestamp: -1 }).limit(100)
      await messages.updateMany(
        {
          roomid: roomid,
          read: {
            $not: { $elemMatch: { userid: ctx.state.data.userid } },
          },
        },
        {
          $push: {
            read: {
              userid: ctx.state.data.userid,
              readAt: new Date(),
            },
          },
        },
      )
      let RoomName = ""
      let messagesResult
      if (room.types === "friend") {
        // ctx.state.data.userid.toString()以外のroom.usersの配列に存在するユーザーのIDを取得
        const friendId = room.users
          .filter((user: any) => user.userid !== ctx.state.data.userid)
          .map((user: any) => user.userid)
        // friendIdのユーザー情報を取得
        const friend = await user.findOne({
          uuid: friendId[0],
        })
        if (!friend) {
          return new Response(
            JSON.stringify({ "status": "Friend Not Found" }),
            {
              headers: { "Content-Type": "application/json" },
              status: 404,
            },
          )
        }
        // friendのuserNameを取得
        RoomName = friend.nickName
        messagesResult = await Promise.all(
          RoomMessages.map(async (message) => {
            let isRead
            const sender = await user.findOne({
              uuid: message.userid,
            })
            if (!sender) {
              return {
                sender: "Unknown",
                senderNickName: "Unknown",
                message: message.message,
                timestamp: message.timestamp,
              }
            }
            isRead = message.read.findIndex(
              (read) => read.userid === friendId[0],
            ) !== -1
            return {
              sender: sender.userName + "@" + env["serverDomain"],
              senderNickName: sender.nickName,
              message: message.message,
              timestamp: message.timestamp,
              isRead: isRead,
              messageType: message.messageType,
              messageid: message.messageid,
            }
          }),
        )
        console.log("fafafafafa")
        //messagesResultの中から自分が未読のメッセージを取得
        const UnreadMessages = RoomMessages.filter(
          (message) =>
            message.read.findIndex(
              (read) => read.userid === ctx.state.data.userid,
            ) === -1,
        )
        const UnreadMessageIds = UnreadMessages.map((message) => message.messageid)
        console.log("UnreadMessageIds", UnreadMessageIds)
        if (UnreadMessageIds.length !== 0) {
          await messages.updateMany(
            {
              roomid: roomid,
              messageid: { $in: UnreadMessageIds },
            },
            {
              $push: {
                read: {
                  userid: ctx.state.data.userid,
                  readAt: new Date(),
                },
              },
            },
          )
        }
        console.log(UnreadMessageIds)
        pubClient.publish(
          redisch,
          JSON.stringify({
            type: "read",
            roomid,
            messageids: UnreadMessageIds,
            reader: ctx.state.data.userid,
            sender: ctx.state.data.userid,
          }),
        )
      } else if (room.types === "remotefriend") {
        //自分のサーバーじゃないユーザーのmessageidを取得
        const OtherServerMessages = RoomMessages.filter(
          (message) => message.userid !== ctx.state.data.userid,
        )
        //自分のサーバーじゃないユーザーのmessageの中で自分が未読のものを取得
        const UnreadMessages = OtherServerMessages.filter(
          (message) =>
            message.read.findIndex(
              (read) => read.userid === ctx.state.data.userid,
            ) === -1,
        )
        //未読のメッセージのmessageidを配列にして返す
        const UnreadMessageIds = UnreadMessages.map((message) => message.messageid)
        if (!RoomMessages) {
          return new Response(
            JSON.stringify({ "status": "Message Not Found" }),
            {
              headers: { "Content-Type": "application/json" },
              status: 404,
            },
          )
        }
        if (UnreadMessageIds.length !== 0) {
          //takostoken
          const friendDomain = splitUserName(
            OtherServerMessages[0].userid,
          ).domain
          const takosTokenArray = new Uint8Array(16)
          const randomarray = crypto.getRandomValues(takosTokenArray)
          const takosToken = Array.from(
            randomarray,
            (byte) => byte.toString(16).padStart(2, "0"),
          ).join("")
          takostoken.create({
            token: takosToken,
            origin: friendDomain,
          })
          const reuslt = await takosfetch(
            `${friendDomain}/api/v1/server/talk/read`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                roomid: roomid,
                messageids: UnreadMessageIds,
                reader: ctx.state.data.userid,
                token: takosToken,
              }),
            },
          )
          if (!reuslt) {
            return new Response(
              JSON.stringify({ "status": "Friend Not Found" }),
              {
                headers: { "Content-Type": "application/json" },
                status: 404,
              },
            )
          }
          if (reuslt.status !== 200) {
            await messages.updateMany(
              {
                roomid: roomid,
                messageid: { $in: UnreadMessageIds },
              },
              {
                $pull: {
                  read: { userid: ctx.state.data.userid },
                },
              },
            )
          }
        }
        const friendId = room.users
          .filter((user: any) => user.userid !== ctx.state.data.userid)
          .map((user: any) => user.userid)
        const takosTokenArray = new Uint8Array(16)
        const randomarray = crypto.getRandomValues(takosTokenArray)
        const takosToken = Array.from(
          randomarray,
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("")
        takostoken.create({
          token: takosToken,
          origin: splitUserName(friendId[0]).domain,
        })
        const OtherServerUser = splitUserName(friendId[0])
        const OtherServerUserDomain = OtherServerUser.domain
        const OtherServerUserInfo = await takosfetch(
          `${OtherServerUserDomain}/api/v1/server/friends/${friendId[0]}/profile?token=${takosToken}&serverDomain=${env["serverDomain"]}&type=id&reqUser=${ctx.state.data.userid}`,
        )
        if (!OtherServerUserInfo) {
          return new Response(
            JSON.stringify({ "status": "Friend Not Found" }),
            {
              headers: { "Content-Type": "application/json" },
              status: 404,
            },
          )
        }
        const OtherServerUserInfoJson = await OtherServerUserInfo.json()
        if (
          OtherServerUserInfoJson.status === false ||
          !OtherServerUserInfoJson
        ) {
          return new Response(
            JSON.stringify({ "status": "Friend Not Found" }),
            {
              headers: { "Content-Type": "application/json" },
              status: 404,
            },
          )
        }
        RoomName = OtherServerUserInfoJson.result.nickName
        const userName = await user.findOne({
          uuid: ctx.state.data.userid,
        })
        if (!userName) {
          return new Response(
            JSON.stringify({ "status": "User Not Found" }),
            {
              headers: { "Content-Type": "application/json" },
              status: 404,
            },
          )
        }
        messagesResult = await Promise.all(
          RoomMessages.map((message) => {
            let sender
            let isRead
            if (message.userid === ctx.state.data.userid) {
              sender = {
                userName: userName.userName + "@" +
                  env["serverDomain"],
                nickName: userName.nickName,
              }
            } else {
              sender = OtherServerUserInfoJson.result
            }
            isRead = message.read.findIndex(
              (read) => read.userid === friendId[0],
            ) !== -1
            if (!sender) {
              return {
                sender: "Unknown",
                senderNickName: "Unknown",
                message: message.message,
                timestamp: message.timestamp,
              }
            }
            return {
              sender: sender.userName,
              senderNickName: sender.nickName,
              message: message.message,
              timestamp: message.timestamp,
              isRead: isRead,
              messageType: message.messageType,
              messageid: message.messageid,
            }
          }),
        )
      } else {
        return
      }
      const result = {
        roomname: RoomName,
        messages: messagesResult,
      }
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      })
    }
  },
}
function splitUserName(userName: string) {
  const split = userName.split("@")
  return {
    userName: split[0],
    domain: split[1],
  }
}
