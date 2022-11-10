import { parse, serialize } from "./cookies";

const encoder = new TextEncoder();
const secretKeyData = encoder.encode("my secret symmetric key");

type Token = { username: string };

let authTokenCookie = "X-Threads-Token";
let authSignatureCookie = "X-Threads-Signature";

function byteStringToUint8Array(byteString: string) {
  const ui = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; ++i) {
    ui[i] = byteString.charCodeAt(i);
  }
  return ui;
}

export async function verifyRequest(req: Request) {
  let cookies = parse(req.headers.get("Cookie") || "");
  console.log(cookies);
  let signature = cookies[authSignatureCookie];
  let token = cookies[authTokenCookie];
  if (!signature || !token) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const receivedMac = byteStringToUint8Array(atob(signature));
  const verified = await crypto.subtle.verify(
    "HMAC",
    key,
    receivedMac,
    encoder.encode(token)
  );
  if (!verified) return null;
  try {
    let data = JSON.parse(token);
    return data as Token;
  } catch (e) {
    return null;
  }
}

export async function addTokenHeaders(token: Token, headers: Headers) {
  let signedToken = await signToken(token);
  headers.append(
    "Set-Cookie",
    serialize(authTokenCookie, signedToken.token, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    })
  );

  headers.append(
    "Set-Cookie",
    serialize(authSignatureCookie, signedToken.signature, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    })
  );
}

export function removeTokenHeaders(headers: Headers) {
  headers.append(
    "Set-Cookie",
    serialize(authTokenCookie, "", { expires: new Date(0) })
  );
  headers.append(
    "Set-Cookie",
    serialize(authSignatureCookie, "", { expires: new Date(0) })
  );
}

async function signToken(token: Token) {
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  let data = JSON.stringify(token);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(data));

  // `mac` is an ArrayBuffer, so you need to make a few changes to get
  // it into a ByteString, and then a Base64-encoded string.
  let base64Mac = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return { signature: base64Mac, token: data };
}
