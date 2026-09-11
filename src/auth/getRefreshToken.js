// Run this ONCE with `npm run auth` to get your GOOGLE_REFRESH_TOKEN.
// It spins up a tiny local server, opens the Google consent screen in your
// browser, and prints the refresh token to paste into .env.

import http from "http";
import { URL } from "url";
import dotenv from "dotenv";
import { getOAuthClient, SCOPES } from "./googleAuth.js";

dotenv.config();

const client = getOAuthClient();

const authUrl = client.generateAuthUrl({
  access_type: "offline", // required to get a refresh token, not just an access token
  prompt: "consent", // forces Google to re-issue a refresh token even if you've authorized before
  scope: SCOPES,
});

console.log("\nOpen this URL in your browser and sign in with your PERSONAL Google account\n");
console.log(authUrl);
console.log("\nWaiting for you to complete the consent flow...\n");

const server = http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, process.env.GOOGLE_REDIRECT_URI);
      const code = url.searchParams.get("code");

      if (!code) {
        res.end("No code found in redirect. Check the console for errors.");
        return;
      }

      const { tokens } = await client.getToken(code);

      res.end("Success. You can close this tab and return to your terminal.");
      console.log("\nRefresh token (paste this into .env as GOOGLE_REFRESH_TOKEN):\n");
      console.log(tokens.refresh_token);
      console.log("\n");

      server.close();
    } catch (err) {
      console.error("Error exchanging code for tokens:", err);
      res.end("Something went wrong. Check the terminal.");
      server.close();
    }
  })
  .listen(3000, () => {
    console.log("Local server listening on http://localhost:3000 for the OAuth redirect.\n");
  });
