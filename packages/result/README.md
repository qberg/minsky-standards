# @minsky/result

Tagged-union `Result<T, E>` with `ok` / `err` / `isOk` / `isErr`. Zero dependencies.

Convention: runtime errors travel as a `Result`; programmer errors throw.

```ts
import { err, isErr, ok, type Result } from "@minsky/result";

const parsePort = (raw: string): Result<number, string> => {
  const port = Number(raw);
  return Number.isInteger(port) ? ok(port) : err(`not a port: ${raw}`);
};
```
