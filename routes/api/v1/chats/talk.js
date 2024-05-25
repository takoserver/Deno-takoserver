import redis from "redis";
import rooms from "../../../../models/rooms.ts";
import users from "../../../../models/users.ts";

const subClient = redis.createClient({
  url: "redis://192.168.0.241:6379",
});
const pubClient = redis.createClient({
  url: "redis://192.168.0.241:6379",
});
subClient.on("error", (err) => console.error("Sub Client Error", err));
pubClient.on("error", (err) => console.error("Pub Client Error", err));

await subClient.connect();
await pubClient.connect();

async function subscribeMessage(channel) {
  await subClient.subscribe(channel, (message) => {
    const data = JSON.parse(message);
    //sessionsオブジェクトからroomidが一致するものをすべて取得
    const sessionsInRoom = Array.from(sessions.values()).filter(
      (session) => session.roomid === data.roomid,
    );
    //roomidが一致するセッションがない場合は終了
    if (sessionsInRoom.length === 0) {
      return;
    }
    //senderをユーザー名に変換
    const sender = sessions.get(data.sessionid);
    data.sender = sender.membersNameChash[data.sender];
    //nickNameを追加
    data.nickName = sender.membersNickNameChash[data.sender];
    //roomidが一致するセッションがある場合は、そのセッションにメッセージを送信
    sessionsInRoom.forEach((session) => {
      console.log("send")
      session.ws.send(JSON.stringify(data));
    });
  });
}

await subscribeMessage("takos");
let sessions = new Map()


export const handler = {
  async GET(req, ctx) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ "status": "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      })
    }
    if (req.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req)
      socket.onopen = async (socket, req) => {
      }
      socket.onmessage = async function (event) {
        const data = JSON.parse(event.data)
        if (data.type == "join") {
          sessions.forEach((session, key) => {
            if(session.ws.redyState === 3) sessions.delete(key)
          })
          const roomid = data.roomid
          const isJoiningRoom = await rooms.findOne({
            name: roomid,
            users: ctx.state.data.userid.toString(),
          })
          const userInfo = await users.findOne({_id: ctx.state.data.userid})
          if (userInfo === null || userInfo === undefined || userInfo.userName == undefined) {
            socket.send(
              JSON.stringify({
                status: false,
                explain: "You are not in the room",
              }),
            )
            return
          }
          if (isJoiningRoom === null || isJoiningRoom === undefined) {
            socket.send(
              JSON.stringify({
                status: false,
                explain: "You are not in the room",
              }),
            )
            return
          }
          const sessionid = generateSessionId()
          sessions.set(sessionid, {
            ws: socket,
            roomid: roomid,
            id: ctx.state.data.userid.toString(),
            membersNameChash: {
              [ctx.state.data.userid.toString()]: userInfo.userName,
            },
            membersNickNameChash: {
              [ctx.state.data.userid.toString()]: userInfo.nickName,
            }
          })
          socket.send(JSON.stringify({ sessionid: sessionid, type: "joined" }))
        }
        if (data.type == "message") {
          sessions.forEach((session, key) => {
            if(session.ws.redyState === 3) sessions.delete(key)
          })
          const roomid = data.roomid
          const session = sessions.get(data.sessionid)
          if (session === undefined) {
            socket.send(
              JSON.stringify({
                status: false,
                explain: "You are not in the room",
              }),
            )
            return
          }
          if (session.roomid !== roomid) {
            socket.send(
              JSON.stringify({
                status: false,
                explain: "You are not in the room",
              }),
            )
            return
          }
          const now = new Date()
          const result = {
            sessionid: data.sessionid,
            type: "message",
            message: data.message,
            sender: ctx.state.data.userid.toString(),
            roomid: roomid,
            time: now,
          }
          await rooms.updateOne(
            { name: roomid },
            {
              $push: {
                messages: {
                  sender: ctx.state.data.userid.toString(),
                  message: data.message,
                  timestamp: now,
                },
              },
            },
          )
          pubClient.publish("takos", JSON.stringify(result))
        }
      }
      socket.onclose = (ws) => {
        console.log("close")
        sessions.forEach((session, key) => {
          if(session.ws.redyState !== 1) sessions.delete(key)
        })
      }
      if (!socket) throw new Error("unreachable")
      return response
    } else {
      return new Response(
        JSON.stringify({ response: "the request is a normal HTTP request" }),
      )
    }
  },
}
function generateSessionId() {
  const array = new Uint8Array(40)
  window.crypto.getRandomValues(array)
  return Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("")
}
