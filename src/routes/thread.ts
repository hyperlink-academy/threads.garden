import { verifyRequest } from "../auth";
import { h, html } from "../html";
import { Route } from "../router";
import { threadDOClient } from "../ThreadDO";
import { four04, redirect } from "../utils";
import { SubmitLinkForm } from "./home";

export const thread_routes: Route[] = [
  {
    method: "GET",
    route: "/t/:thread",
    handler: async (request, { env, routeParams }) => {
      if (!routeParams.thread) return four04();
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );
      let data = await threadDOClient(threadStub, "get_data", {
        username: auth?.username,
      });
      let action = data.subscribed ? "unsubscribe" : "subscribe";

      return new Response(
        html(
          [h("title", "thread")],
          [
            h(
              "ul",
              data.threads.map((e) => h("li", h("a", { href: e.url }, e.title)))
            ),
            auth
              ? h(
                  "form",
                  {
                    action: `/t/${routeParams.thread}/${action}`,
                    method: "POST",
                  },
                  h("button", action)
                )
              : null,
            !auth
              ? null
              : SubmitLinkForm({
                  action: `/t/${routeParams.thread}/reply`,
                  buttonText: "reply",
                }),
          ]
        ),
        {
          headers: { "Content-type": "text/html" },
        }
      );
    },
  },
  {
    method: "POST",
    route: "/t/:thread/subscribe",
    handler: async (request, { routeParams, env }) => {
      if (!routeParams.thread) return four04();
      console.log(request.headers);
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      if (!auth) return redirect(`/t/${routeParams.thread}`);

      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );
      await threadDOClient(threadStub, "subscribe", {
        username: auth.username,
      });

      return redirect(`/t/${routeParams.thread}`);
    },
  },
  {
    method: "POST",
    route: "/t/:thread/unsubscribe",
    handler: async (request, { routeParams, env }) => {
      if (!routeParams.thread) return four04();
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      if (!auth) return redirect(`/t/${routeParams.thread}`);

      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );
      await threadDOClient(threadStub, "unsubscribe", {
        username: auth.username,
      });

      return redirect(`/t/${routeParams.thread}`);
    },
  },
  {
    method: "POST",
    route: "/t/:thread/reply",
    handler: async (request, { routeParams, env }) => {
      if (!routeParams.thread) return four04();
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      let formData = await request.formData();
      let url = formData.get("url");
      let title = formData.get("title");
      if (!url || !title) return new Response("error, no url");
      if (!auth) return redirect(`/t/${routeParams.thread}`);

      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );
      await threadDOClient(threadStub, "add_entry", {
        url: url.toString(),
        title: title.toString(),
        submitter: auth.username,
      });

      return redirect(`/t/${routeParams.thread}`);
    },
  },
];
