import { verifyRequest } from "./auth";
import { h, html } from "./html";
import { Router } from "./router";
import { LoginRoutes } from "./routes/login";

let router = Router({
  base: "",
  routes: [
    {
      method: "GET",
      route: "/",
      handler: async (req) => {
        let auth = await verifyRequest(req);
        return new Response(
          html(
            [h("title", "threads.garden")],
            [
              h("p", "this is a little site to make threads on the internet"),
              auth
                ? h("a", { href: "/home" }, "home")
                : h("a", { href: "/login" }, "login"),
            ]
          ),
          {
            headers: { "Content-type": "text/html" },
          }
        );
      },
    },
    {
      method: "GET",
      route: "/home",
      handler: async (req) => {
        let auth = await verifyRequest(req);
        if (!auth)
          return new Response("", {
            status: 302,
            headers: { Location: "/login" },
          });
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
              h("a", { href: "/new" }, h("button", "create a thread")),
            ]
          ),
          {
            headers: { "Content-type": "text/html" },
          }
        );
      },
    },
    ...LoginRoutes,
    {
      method: "GET",
      route: "/new",
      handler: async () => {
        return new Response(html([], [h("p", "a new thread!")]), {
          headers: { "Content-type": "text/html" },
        });
      },
    },
    {
      method: "GET",
      route: "/u/:username",
      handler: async (_request, queryParams) => {
        return new Response("user page: " + queryParams.username);
      },
    },
  ],
});
export default {
  fetch: (request: Request) => {
    return router(request);
  },
};
