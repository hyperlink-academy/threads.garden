// adapted from https://github.com/jshttp/cookie/blob/master/index.js

type Options = {
  path?: string;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  expires?: Date;
  maxAge?: number;
};

export function serialize(name: string, val: string, options: Options) {
  var opt = options;
  var enc = encodeURIComponent;

  var value = enc(val);

  var str = name + "=" + value;

  if (null != opt.maxAge) {
    var maxAge = opt.maxAge - 0;

    if (isNaN(maxAge) || !isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }

    str += "; Max-Age=" + Math.floor(maxAge);
  }

  if (opt.path) {
    str += "; Path=" + opt.path;
  }

  if (opt.expires) {
    var expires = opt.expires;
    str += "; Expires=" + expires.toUTCString();
  }

  if (opt.httpOnly) {
    str += "; HttpOnly";
  }

  if (opt.secure) {
    str += "; Secure";
  }

  if (opt.sameSite) {
    switch (opt.sameSite) {
      case "lax":
        str += "; SameSite=Lax";
        break;
      case "strict":
        str += "; SameSite=Strict";
        break;
      case "none":
        str += "; SameSite=None";
        break;
      default:
        throw new TypeError("option sameSite is invalid");
    }
  }

  return str;
}

export function parse(str: string) {
  var obj: { [k: string]: string } = {};
  var index = 0;
  while (index < str.length) {
    var eqIdx = str.indexOf("=", index);

    // no more cookie pairs
    if (eqIdx === -1) {
      break;
    }

    var endIdx = str.indexOf(";", index);

    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      // backtrack on prior semicolon
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }

    var key = str.slice(index, eqIdx).trim();

    // only assign once
    if (undefined === obj[key]) {
      var val = str.slice(eqIdx + 1, endIdx).trim();

      // quoted values
      if (val.charCodeAt(0) === 0x22) {
        val = val.slice(1, -1);
      }

      obj[key] = decode(val);
    }

    index = endIdx + 1;
  }

  return obj;
}

function decode(str: string) {
  try {
    return str.indexOf("%") !== -1 ? decodeURIComponent(str) : str;
  } catch (e) {
    return str;
  }
}
