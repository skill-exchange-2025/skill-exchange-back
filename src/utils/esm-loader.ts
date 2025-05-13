export async function loadTransformers(): Promise<
  typeof import('@xenova/transformers')
> {
  return await import('@xenova/transformers');
}
