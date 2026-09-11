# Direct Random User data

The only production provider is [Random User](https://randomuser.me/documentation). No account or key is required.

The server requests 5,000 profiles with API version 1.4, seed `northline`, and these included fields:

```text
name,gender,location,email,dob,registered,phone,nat,login
```

There is no nationality restriction, so country comparisons have multiple groups. Zod validates the complete batch and its metadata, retains only the required fields, and keeps only `login.uuid` from the login object. Each table row uses that UUID as its key. Profiles keep their supplied nested field structure; there is no template mapper or generated business data.

A valid batch is cached for five minutes per server process. Concurrent requests share the same in-flight fetch. After expiry, a new successful request is required; failures do not silently serve local fixtures. Restarting the server clears its cache.

The API itself generates fictional people. We use its values directly, but do not claim those profiles represent real customers or population statistics. Age is `dob.age`, and registration filters use `registered.date`. Fetched-at is when our server loaded the batch and is independent of registration dates.

Test fixtures live only under `tests/fixtures`. Browser tests intercept our endpoints; production always uses Random User.
