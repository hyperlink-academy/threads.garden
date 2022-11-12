export const redirect = (
  Location: string,
  headers: Headers = new Headers()
) => {
  headers.append("Location", Location);
  return new Response("", { status: 302, headers });
};

export const four04 = () => new Response("404", { status: 404 });
