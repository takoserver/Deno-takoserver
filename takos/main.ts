import { Hono } from "hono";
import sessions from "./web/sessions.ts";
import profile from "./web/profile.ts";
import keys from "./web/keys.ts";
import server from "./web/server.ts";
import mongoose from "mongoose";
import gets from "./foundation/gets.ts";
import friend from "./web/friend.ts"
import { load } from "@std/dotenv";
import serverKey from "./models/serverKeys.ts";
import { generateServerKey } from "@takos/takos-encrypt-ink";
import foundationApi from "./foundation/server.ts";
const env = await load();
const app = new Hono();
const appClient = new Hono();
const appServer = new Hono();
appClient.route("sessions", sessions);
appClient.route("profile", profile);
appClient.route("keys", keys);
appClient.route("friend", friend);
appClient.route("server", server);
appServer.route("v2", gets);
appServer.route("v2", foundationApi);
app.route("_takos", appServer);
app.route("api/v2", appClient);

await mongoose.connect(String(env["MONGO_URI"]));

if(!await serverKey.findOne({}).sort({ expires: -1 })) {
    const key = generateServerKey();
    await serverKey.create(key);
}

export default app;
