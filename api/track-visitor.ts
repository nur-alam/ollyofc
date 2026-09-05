export const config = {
  runtime: "edge",
};

function decodeHeader(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();

  return (
    first ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    ""
  );
}

export default function handler(request: Request) {
  return new Response(
    JSON.stringify({
      ip: clientIp(request),
      city: decodeHeader(request.headers.get("x-vercel-ip-city")),
      region: decodeHeader(request.headers.get("x-vercel-ip-country-region")),
      country: (request.headers.get("x-vercel-ip-country") ?? "").toUpperCase(),
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
