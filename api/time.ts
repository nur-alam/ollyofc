export const config = {
  runtime: "edge",
};

export default function handler() {
  return new Response(JSON.stringify({ now: Date.now() }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
    },
  });
}
