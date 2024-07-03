#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts"
import config from "./fresh.config.ts"

import "$std/dotenv/load.ts"
/**connect mongoDB */
import mongoose from "mongoose"
import { load } from "$std/dotenv/mod.ts"
/**connect mongoDB */
const env = await load()
const url = env["MONGO_URL"]
await mongoose.connect(url).then(() => {
  console.log("mongo DB 接続")
}).catch((err) => {
  console.log(err)
})

await dev(import.meta.url, "./main.ts", config)
