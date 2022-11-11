import { verifyRequest } from "./auth";
import { h, html } from "./html";
import { Router } from "./router";
import { create_thread_route } from "./routes/create_thread";
import { home_route } from "./routes/home";
import { LoginRoutes } from "./routes/login";
import { thread_route } from "./routes/thread";

export type Env = {
  TOKEN_SECRET: string;
  USER: DurableObjectNamespace;
  THREAD: DurableObjectNamespace;
  POSTMARK_API_TOKEN?: string;
};
export { UserDO } from "./UserDO";
export { ThreadDO } from "./ThreadDO";
export default {
  fetch: (request: Request, env: Env) => {
    return router(request, env);
  },
};

let router = Router({
  base: "",
  routes: [
    create_thread_route,
    thread_route,
    home_route,
    ...LoginRoutes,
    {
      method: "GET",
      route: "/",
      handler: async (req, { env }) => {
        let auth = await verifyRequest(req, env.TOKEN_SECRET);
        return new Response(
          html(
            [h("title", "threads.garden")],
            [
              h("p", "this is a little site to make threads on the internet"),
              h(
                "p",
                "when you create a thread, people can reply by submitting links"
              ),
              h("p", "you moderate which links you accept for your thread"),
              h(
                "p",
                "you can subscribe to threads and once a day we'll send you an email with any new replies to all threads you subscribe to"
              ),
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
      route: "/u/:username",
      handler: async (_request, { routeParams }) => {
        return new Response("user page: " + routeParams.username);
      },
    },
  ],
});
