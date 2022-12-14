import { update_user_route } from "routes/update_user";
import { Router } from "./router";
import { create_thread_route } from "./routes/create_thread";
import { home_route } from "./routes/home";
import { index_route } from "./routes/index_route";
import { LoginRoutes } from "./routes/login";
import { thread_routes } from "./routes/thread";
import styles from "./styles.css";

export type Env = {
  TOKEN_SECRET: string;
  USER: DurableObjectNamespace;
  THREAD: DurableObjectNamespace;
  POSTMARK_API_TOKEN?: string;
};
export { ThreadDO } from "./ThreadDO";
export { UserDO } from "./UserDO";
export default {
  fetch: (request: Request, env: Env) => {
    return router(request, env);
  },
};

let router = Router({
  base: "",
  routes: [
    create_thread_route,
    update_user_route,
    home_route,
    index_route,
    ...thread_routes,
    ...LoginRoutes,

    {
      method: "GET",
      route: "/styles.css",
      handler: async () => {
        return new Response(styles, {
          headers: { "Content-type": "text/css" },
        });
      },
    },
  ],
});
