import { parse, serialize } from "./cookies";

export type Token = { username: string };

let authTokenCookie = "X-Threads-Token";
let authSignatureCookie = "X-Threads-Signature";

const encoder = new TextEncoder();
let cachedKey: CryptoKey;
const getKey = async (secret: string) => {
  if (cachedKey) return cachedKey;
  const secretKeyData = encoder.encode(secret);
  cachedKey = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify", "sign"]
  );
  return cachedKey;
};

function byteStringToUint8Array(byteString: string) {
  const ui = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; ++i) {
    ui[i] = byteString.charCodeAt(i);
  }
  return ui;
}

export async function verifyRequest(req: Request, secret: string) {
  let cookies = parse(req.headers.get("Cookie") || "");
  let signature = cookies[authSignatureCookie];
  let token = cookies[authTokenCookie];
  if (!signature || !token) return null;

  const receivedMac = byteStringToUint8Array(atob(signature));
  let key = await getKey(secret);
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

export async function addTokenHeaders(
  token: Token,
  headers: Headers,
  secret: string
) {
  let signedToken = await signToken(token, secret);
  headers.append(
    "Set-Cookie",
    serialize(authTokenCookie, signedToken.token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    })
  );

  headers.append(
    "Set-Cookie",
    serialize(authSignatureCookie, signedToken.signature, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
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

async function signToken(token: Token, secret: string) {
  const key = await getKey(secret);
  let data = JSON.stringify(token);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(data));

  // `mac` is an ArrayBuffer, so you need to make a few changes to get
  // it into a ByteString, and then a Base64-encoded string.
  let base64Mac = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return { signature: base64Mac, token: data };
}
