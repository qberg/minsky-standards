# @minsky/tsconfig

Four configs. `base` carries the strictness the org treats as non-negotiable, and the
other three only add an environment.

| File           | Use for                                                |
| -------------- | ------------------------------------------------------ |
| `base.json`    | anything, extended by the rest                          |
| `node.json`    | servers, workers, CLIs (`types: ["node"]`, `noEmit`)    |
| `react.json`   | browser apps (`jsx: react-jsx`, DOM libs, `noEmit`)     |
| `library.json` | publishable packages (declarations, `src` -> `dist`)    |

```json
{
  "extends": "@minsky/tsconfig/library.json",
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

Two flags do most of the work and are the ones people try to turn off:

- `exactOptionalPropertyTypes`: `{ x: undefined }` is not a valid `x?: string`. Build
  the object with a conditional spread, `...(cond ? { x } : {})`.
- `noUncheckedIndexedAccess`: `arr[0]` and `record[key]` are `T | undefined`, because
  they are. Narrow at the access.
