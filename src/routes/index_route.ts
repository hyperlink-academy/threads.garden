import { Route } from "router";
import { verifyRequest } from "auth";
import { h, html } from "html";
export const index_route: Route = {
  method: "GET",
  route: "/",
  handler: async (req, { env }) => {
    let auth = await verifyRequest(req, env.TOKEN_SECRET);
    return new Response(
      html({ head: h("title", "threads.garden"), token: auth }, [
        h("p", { style: "color: green; padding-left: 3%;" }, "—=-_-˜¯-_-≈-"),
        h("p", { style: "color: #00851d; padding-left:6%;" }, "a small site"),
        h(
          "p",
          { style: "color: #597f00; padding-left:9%;" },
          "for making threads"
        ),
        h(
          "p",
          { style: "color: #028550; padding-left:12%;" },
          "on the internet"
        ),
        h(
          "p",
          { style: "color: green; padding-left:15%;" },
          "—=-¯˜-≈-_-=≈-_-=—>"
        ),
        h(
          "div",
          {
            style:
              "padding: 1em; background: #f7eea9; border-radius: 8px; margin: 0 16% 1em 20%;",
          },
          [
            h("h2", "start a thread:"),
            h("ul", [
              h("li", "share a link to something you wrote or made"),
              h("li", "others can submit new links to reply"),
              h("li", "you moderate which links to add to your thread"),
            ]),
          ]
        ),
        h(
          "div",
          {
            style:
              "padding: 1em; background: #d6edba; border-radius: 8px; margin: 0 8% 1em 25%;;",
          },
          [
            h("h2", "subscribe to threads:"),
            h("ul", [
              h("li", "drop your email for any thread"),
              h("li", "get a digest with updates for all threads you follow"),
              h("li", "just one email a day; unsub any time"),
            ]),
          ]
        ),
        h(
          "div",
          {
            style:
              "padding: 1em; background: #caec85; border-radius: 8px; margin: 0 0 1em 30%;",
          },
          [h("p", "~reply soon — threads close after 7 days!~")]
        ),
      ]),
      {
        headers: { "Content-type": "text/html" },
      }
    );
  },
};
