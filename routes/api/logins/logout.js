import { getCookies } from "https://deno.land/std@0.220.1/http/cookie.ts";
import sessionID from "../../../models/sessionid.js";
import re from "https://esm.sh/v135/preact-render-to-string@6.3.1/X-ZS8q/denonext/preact-render-to-string.mjs";
export const handler = {
  async POST(req, ctx) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ "status": "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      });
    }
    try {
      const data = await req.json();
      const sessionid = ctx.state.data.sessionid;
      if (data.reqirments !== "logout") {
        return new Response(JSON.stringify({ "status": "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        });
      }
      const result = await sessionID.deleteOne({ sessionID: sessionid });
      if (result.acknowledged) {
        return new Response(JSON.stringify({ "status": true }), {
          headers: {
            "Content-Type": "application/json",
            status: 200,
            "Set-Cookie": `sessionid=; Path=/; Max-Age=0;`,
          },
        });
      } else {
        return new Response(JSON.stringify({ "status": false }), {
          headers: {
            "Content-Type": "application/json",
            status: 500,
            "Set-Cookie": `sessionid=; Path=/; Max-Age=0;`,
          },
        });
      }
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ "status": "error" }), {
        headers: { "Content-Type": "application/json" },
        status: 403,
      });
    }
  },
};
