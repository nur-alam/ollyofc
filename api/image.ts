import { isAllowedPhotoUrl, PHOTO_PROXY_MAX_BYTES } from "./photo-proxy";

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim() ?? "";

  if (!isAllowedPhotoUrl(url)) {
    return new Response("Bad request", { status: 400 });
  }

  const upstream = await fetch(url, { cache: "no-store" });
  const type = upstream.headers.get("content-type") ?? "";

  if (!upstream.ok || !type.startsWith("image/")) {
    return new Response("Not found", { status: 404 });
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());

  if (bytes.byteLength > PHOTO_PROXY_MAX_BYTES) {
    return new Response("Too large", { status: 413 });
  }

  return new Response(bytes, {
    headers: {
      "content-type": type,
      "cache-control": "private, max-age=300",
    },
  });
}
