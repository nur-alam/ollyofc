# Workers KV

`KEY_NAME` is the KV key. `VALUE` is the string stored under that key.

## List keys

Returns key names, not values. A read-only token is enough. `cursor` in the response is the next page; pass it as `?cursor=` until it is empty.

```bash
curl \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/keys" \
  -H "Authorization: Bearer $CLOUDFLARE_API_KEY"
```

## Read a value

The response body is the stored string. A missing key returns `10009` / `key not found`.

```bash
curl \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/values/$KEY_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_API_KEY"
```

## Write a value

Creates the key or replaces its value. Either request works.

The value is the raw request body:

```bash
curl \
  -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/values/$KEY_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_API_KEY" \
  --data "$VALUE"
```

The value is a form field named `value`:

```bash
curl \
  -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/values/$KEY_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_API_KEY" \
  -F "value=$VALUE"
```

Both commands need `-X PUT`. Without it, curl sends POST to `/values/$KEY_NAME`, and KV answers `POST not supported`.

## Write pairs as JSON

Writes one or more pairs in one request. An existing key is replaced. Up to 10,000 pairs, and the body must be under 100 MB.

```bash
curl \
  -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/bulk" \
  -H "Authorization: Bearer $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" \
  --data '[
    {"key": "juicy", "value": "pops"},
    {"key": "fc", "value": "okk"}
  ]'
```

A successful response includes `successful_key_count`. Keys that failed are listed in `unsuccessful_keys`.

## Delete a key

Removes the key and its value. The token needs **Workers KV Storage → Write**.

```bash
curl \
  -X DELETE \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/values/$KEY_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_API_KEY"
```

A successful response is `"success": true`. Reading the key afterward returns `key not found`. Percent-encode characters such as `:`, `!`, and `%` in `$KEY_NAME`.

## Delete several keys

KV accepts POST here. The body is a JSON array of key names, up to 10,000. The token needs **Workers KV Storage → Write**.

```bash
curl \
  -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/bulk/delete" \
  -H "Authorization: Bearer $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" \
  --data '["juicy", "fc"]'
```

A successful response includes `successful_key_count`. Keys that failed are listed in `unsuccessful_keys`.

## Variables

| Variable | What it is |
| --- | --- |
| `ACCOUNT_ID` | Your Cloudflare account id. On the dashboard it is in the right sidebar, and it is the first id in a URL like `dash.cloudflare.com/<account-id>/...`. |
| `NAMESPACE_ID` | The Workers KV namespace that holds the key. In the dashboard: **Storage & databases → KV →** the namespace **→ ID**. |
| `CLOUDFLARE_API_KEY` | A Cloudflare **API token** sent as `Authorization: Bearer`. Create it under **My Profile → API Tokens** with **Account → Workers KV Storage → Read** to read, and **Workers KV Storage → Write** to write. The Global API Key does not work in this header. |
