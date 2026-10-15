export const runtimeBucket = "ilove-pets-function-runtime"
export const runtimeHash = "b7d6710436b150dc5bd1ca04d80b6b7614c54854d7470f888f7e69a2a41b00e4"
export const runtimeBytes = 15447097
export const runtimeKey = `magick/0.0.44/${runtimeHash}.wasm`

export async function loadRuntimeWasm(base, serviceKey, fetcher = fetch) {
  const url = new URL(`/storage/v1/object/authenticated/${runtimeBucket}/${runtimeKey}`, base)
  const response = await fetcher(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok || !response.body) throw new Error("runtime_module_unavailable")
  const bytes = new Uint8Array(runtimeBytes)
  let offset = 0
  const reader = response.body.getReader()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (offset + value.length > runtimeBytes) throw new Error("runtime_module_integrity")
      bytes.set(value, offset)
      offset += value.length
    }
  } finally {
    await reader.cancel()
  }
  if (offset !== runtimeBytes) throw new Error("runtime_module_integrity")
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  const hash = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
  if (hash !== runtimeHash) throw new Error("runtime_module_integrity")
  return bytes
}
