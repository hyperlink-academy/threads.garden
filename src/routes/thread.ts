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
      let entries = await threadDOClient(threadStub, "get_entries", {});
      return new Response(
        html(
          [h("title", "thread")],
          [
            h(
              "ul",
              entries.threads.map((e) =>
                h("li", h("a", { href: e.url }, e.title))
              )
            ),
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
