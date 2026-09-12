export interface DestroyableRenderer {
  readonly destroy: () => void;
}

export const withRenderer = async <Renderer extends DestroyableRenderer, A>(
  create: () => Promise<Renderer>,
  use: (renderer: Renderer) => Promise<A>,
): Promise<A> => {
  const renderer = await create();
  try {
    return await use(renderer);
  } finally {
    renderer.destroy();
  }
};
