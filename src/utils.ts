export const redirect = (
  Location: string,
  headers: Headers = new Headers()
) => {
  headers.append("Location", Location);
  return new Response("", { status: 302, headers });
};
