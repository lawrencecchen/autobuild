export async function retry<T>(params: {
  fn: () => Promise<T>
  tries: number
  sleepTime: number
  onError?: (attempt: number, error: Error) => void
}): Promise<T> {
  let result: T | null = null
  for (let i = 0; i < params.tries; i++) {
    try {
      result = await params.fn()
      break
    } catch (e) {
      if (e instanceof Error && params.onError) {
        params.onError(i, e)
      }
      if (i === params.tries - 1) {
        throw e
      }
      if (params.sleepTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, params.sleepTime))
      }
    }
  }
  if (result === null) {
    throw new Error('Function failed after all retries')
  }
  return result
}
