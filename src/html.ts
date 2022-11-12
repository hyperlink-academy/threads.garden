export type Child = string | (() => string) | null;
type Attributes = { [k: string]: string | boolean };
export function h(
  t: string,
  attrsOrChildren?: Attributes | Child | Child[],
  _children?: Child | Child[]
) {
  let attrs: Attributes = {};
  let children = _children;
  if (
    attrsOrChildren &&
    typeof attrsOrChildren !== "string" &&
    typeof attrsOrChildren !== "function" &&
    !Array.isArray(attrsOrChildren)
  )
    attrs = attrsOrChildren;
  else children = attrsOrChildren;
  return () =>
    `<${t} ${renderAttributes(attrs)}> 
    ${children ? renderChildren(children) : ""}
    </${t}>`;
}

const renderAttributes = (attrs: Attributes) =>
  Object.entries(attrs)
    .map(([k, v]) =>
      typeof v === "string" ? `${escapeHtml(k)}="${escapeHtml(v)}"` : k
    )
    .join(" ");

const renderChildren = (c: Child | Child[]) =>
  [c]
    .flat()
    .map((c) => (typeof c === "string" ? escapeHtml(c) : c?.() || ""))
    .join("\n");

const matchHtmlRegExp = /["'&<>]/;
function escapeHtml(str: string) {
  const match = matchHtmlRegExp.exec(str);

  if (!match) {
    return str;
  }

  let escape;
  let html = "";
  let index;
  let lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = "&quot;";
        break;
      case 38: // &
        escape = "&amp;";
        break;
      case 39: // '
        escape = "&#x27;"; // modified from escape-html; used to be '&#39'
        break;
      case 60: // <
        escape = "&lt;";
        break;
      case 62: // >
        escape = "&gt;";
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}

export function html(head: Child | Child[], children: Child | Child[]) {
  return (
    "<!DOCTYPE html> \n" +
    h("html", { lang: "en-US" }, [
      h("head", [
        ...[head].flat(),
        h("meta", { charset: "utf-8" }),
        h("meta", { name: "viewport", content: "width=device-width" }),
        h(
          "style",
          `
          ul { padding-left: 16px; }
          body { background: snow; color: darkslategrey; margin: auto; max-width: 800px;padding: 16px; }
          `
        ),
      ]),
      h("body", [
        h("a", { href: "/", style: "color:blue;" }, h("h1", "threads.garden")),
        ...[children].flat(),
      ]),
    ])()
  );
}
