import { verifyRequest } from "auth";
import { Route } from "router";
import { index_route } from "routes/thread/index_route";
import { threadDOClient } from "ThreadDO";
import { four04, redirect } from "utils";

export const thread_routes: Route[] = [
  index_route,
  {
    method: ["POST"],
    route: "/t/:thread/entry/:entry",
    handler: async (request, { routeParams, env }) => {
      if (!routeParams.thread || !routeParams.entry) return four04();
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      if (!auth) return redirect(`/t/${routeParams.thread}`);
      let data = await request.formData();
      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );

      await threadDOClient(threadStub, "update_entry", {
        entry: routeParams.entry,
        approved: data.get("approve") === "approve",
        username: auth.username,
      });

      return redirect(`/t/${routeParams.thread}`);
    },
  },
  {
    method: "POST",
    route: "/t/:thread/subscribe",
    handler: async (request, { routeParams, env }) => {
      if (!routeParams.thread) return four04();
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
        date: new Date().toISOString(),
        url: url.toString(),
        title: title.toString(),
        submitter: auth.username,
      });

      return redirect(`/t/${routeParams.thread}`);
    },
  },
];
