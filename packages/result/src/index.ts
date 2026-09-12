export type Ok<T> = { readonly _tag: "Ok"; readonly value: T };
export type Err<E> = { readonly _tag: "Err"; readonly error: E };
export type Result<T, E> = Err<E> | Ok<T>;

// E defaults to never, so a bare ok() inside a generic over Result cannot widen E to unknown.
export const ok = <T, E = never>(value: T): Result<T, E> => ({ _tag: "Ok", value });
export const err = <T = never, E = never>(error: E): Result<T, E> => ({ _tag: "Err", error });

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> =>
  result._tag === "Ok";
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
  result._tag === "Err";
