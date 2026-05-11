# dka

To install dependencies:

```bash
bun install
```

Before running the PDF workflow, start Gotenberg locally:

```bash
docker run --rm -p 3000:3000 gotenberg/gotenberg:8
```

If Gotenberg is not on `http://127.0.0.1:3000`, set `GOTENBERG_URL` to the correct base URL.

To run:

```bash
bun run 
```

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
