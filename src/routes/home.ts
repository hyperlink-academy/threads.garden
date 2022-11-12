import { verifyRequest } from "../auth";
import { h, html } from "../html";
import { Route } from "../router";
import { userDOClient } from "../UserDO";

export const home_route: Route = {
  method: "GET",
  route: "/home",
  handler: async (req, { env }) => {
    let auth = await verifyRequest(req, env.TOKEN_SECRET);
    if (!auth)
      return new Response("", {
        status: 302,
        headers: { Location: "/login" },
      });

    let userDO = env.USER.get(env.USER.idFromName(auth.username));
    let threads = await userDOClient(userDO, "get_threads", {});
    return new Response(
      html(
        [h("title", "threads.garden")],
        [
          h("h1", "Welcome, " + auth.username),
          h("a", { href: "/logout" }, "logout"),
          h(
            "p",
            "this is your homepage, it should have a list of stuff. If you aren't logged in, redirect"
          ),
          threads.threads.length === 0
            ? null
            : h(
                "ul",
                threads.threads.map((t) =>
                  h("li", h("a", { href: `/t/${t.id}` }, t.title))
                )
              ),
          SubmitLinkForm({
            action: "/create_thread",
            buttonText: "create a thread",
          }),
        ]
      ),
      {
        headers: { "Content-type": "text/html" },
      }
    );
  },
};

export const SubmitLinkForm = (props: { action: string; buttonText: string }) =>
  h(
    "form",
    {
      method: "POST",
      action: props.action,
      style:
        "max-width: 320px; padding: 8px; border: 1px solid; display: flex; flex-direction:column; gap: 4px;",
    },
    [
      h("div", { style: "display:grid;grid-template-columns: 32px auto;" }, [
        h("label", { for: "url" }, "url"),
        h("input", {
          id: "url",
          name: "url",
          type: "url",
          required: true,
        }),
      ]),
      h("div", { style: "display:grid;grid-template-columns: 32px auto;" }, [
        h("label", { for: "title" }, "title"),
        h("input", {
          required: true,
          id: "title",
          name: "title",
          type: "text",
          maxlength: "140",
        }),
      ]),
      h("button", props.buttonText),
    ]
  );
