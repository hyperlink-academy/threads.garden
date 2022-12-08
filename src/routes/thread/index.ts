import { verifyRequest } from "auth";
import { Route } from "router";
import { index_route } from "routes/thread/index_route";
import { threadDOClient } from "ThreadDO";
import { userDOClient } from "UserDO";
import { four04, redirect } from "utils";

export const thread_routes: Route[] = [
  index_route,
  {
    method: "POST",
    route: "/t/:thread/delete",
    handler: async (request, { routeParams, env }) => {
      if (!routeParams.thread) return four04();
      let auth = await verifyRequest(request, env.TOKEN_SECRET);
      if (!auth) return redirect(`/t/${routeParams.thread}`);

      let userDO = env.USER.get(env.USER.idFromName(auth.username));
      await userDOClient(userDO, "delete_thread", {
        username: auth.username,
        threadID: routeParams.thread,
      });

      return redirect(`/`);
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
      let userDO = env.USER.get(env.USER.idFromName(auth.username));
      await threadDOClient(threadStub, "subscribe", {
        username: auth.username,
      });
      let data = await threadDOClient(threadStub, "get_metadata", {});
      await userDOClient(userDO, "add_subscription", {
        username: auth.username,
        threadID: routeParams.thread,
        threadTitle: data.metadata.title,
        dateCreated: data.metadata.dateCreated,
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
      let replies = formData.getAll("reply").map((f) => f.toString());
      if (!url || !title) return new Response("error, no url");
      if (!auth) return redirect(`/t/${routeParams.thread}`);

      let threadStub = env.THREAD.get(
        env.THREAD.idFromString(routeParams.thread)
      );
      await threadDOClient(threadStub, "add_entry", {
        date: new Date().toISOString(),
        url: url.toString(),
        title: title.toString(),
        replies,
        submitter: auth,
      });

      return redirect(`/t/${routeParams.thread}`);
    },
  },
];
