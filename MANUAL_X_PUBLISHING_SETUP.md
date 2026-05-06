# Manual X Publishing Mode

This build intentionally does **not** post through the X API. X API posting may require paid credits and can still be limited to standard post lengths.

## Workflow

1. Go to `/cardano-admin`.
2. Review/edit the generated tweet. Long-form posts are allowed.
3. Upload the ChatGPT-generated image if desired.
4. Click **Copy Tweet**.
5. Click **Open X Composer**.
6. Paste/verify the post in X, attach the image manually, and publish from your Premium account.
7. Return to the admin page and click **Mark Posted**.
8. Optionally paste the X URL/post ID so it is stored as `x_post_id`.

## Database fields

The admin page expects these optional fields on `cardano_posts`:

```sql
alter table cardano_posts
add column if not exists x_post_id text,
add column if not exists posted_at timestamptz;
```

## Status values

Supported status values are:

- `draft`
- `pending`
- `approved`
- `posted`
- `rejected`

