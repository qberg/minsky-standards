// A Queue call awaits a one-shot connect promise that settles only on ready or end
// (bullmq redis-connection.js waitUntilReady), which is unbounded, so race it.
export async function withDeadline<T>(
  op: Promise<T>,
  label: string,
  deadlineMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} exceeded ${deadlineMs}ms`)),
      deadlineMs
    );
  });
  try {
    return await Promise.race([op, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
