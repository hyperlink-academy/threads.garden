export type Child = string | (() => string) | null;
import { Token } from "auth";
import styles from "./styles.css";
type Attributes = { [k: string]: string | boolean };

export function h<Props>(
  t: string | ((props: Props) => () => string),
  attrsOrChildren?: Props | Child | Child[],
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
  else children = attrsOrChildren as Child | Child[];
  if (typeof t === "function") return t({ ...attrs, children } as Props);
  return () =>
    `<${t} ${renderAttributes(attrs)}> 
    ${children ? renderChildren(children) : ""}
    </${t}>`;
}

const renderAttributes = (attrs: Attributes) =>
  Object.entries(attrs)
    .map(([k, v]) =>
      typeof v === "string" ? `${escapeHtml(k)}="${escapeHtml(v)}"` : v ? k : ""
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

export function html(
  props: { token: Token | null; head: Child | Child[] },
  children: Child | Child[]
) {
  return (
    "<!DOCTYPE html> \n" +
    h("html", { lang: "en-US" }, [
      h("head", [
        ...[props.head].flat(),
        h("meta", { charset: "utf-8" }),
        h("meta", { name: "viewport", content: "width=device-width" }),
        h("meta", {
          name: "description",
          content:
            "threads.garden - a small site for making threads on the internet",
        }),
        h("style", styles),
      ]),
      h("body", [
        h("div", { class: "body-wrapper" }, [
          h("div", { class: "flex flex-row gap-2 space-between" }, [
            h("a", { href: "/" }, h("h1", "threads.garden")),

            h(
              "div",
              { style: "text-align: right;", class: "align-self-center" },
              [props.token ? null : h("a", { href: "/login" }, "login")]
            ),
          ]),
          ...[children].flat(),
        ]),
        h("footer", [
          h("hr"),
          h("p", { style: "margin: -4px 0 18px 0" }, [
            "a project by ",
            h("a", { href: "https://hyperlink.academy" }, "hyperlink.academy"),
          ]),
        ]),
      ]),
    ])()
  );
}
