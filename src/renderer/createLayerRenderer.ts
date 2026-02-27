import type { Container, Texture } from 'pixi.js'
import type { ResolvedLayer } from '../types'
import type { TileSetRenderer } from './TileSetRenderer.js'
import type { MapContext } from './tilePlacement.js'
import { TileLayerRenderer } from './TileLayerRenderer.js'
import { ImageLayerRenderer } from './ImageLayerRenderer.js'
import { ObjectLayerRenderer } from './ObjectLayerRenderer.js'
import { GroupLayerRenderer } from './GroupLayerRenderer.js'

export function createLayerRenderer(
  layer: ResolvedLayer,
  tilesets: TileSetRenderer[],
  ctx: MapContext,
  imageTextures: Map<string, Texture>
): Container | null {
  switch (layer.type) {
    case 'tilelayer':
      return new TileLayerRenderer(layer, tilesets, ctx)

    case 'imagelayer': {
      const tex = layer.image ? (imageTextures.get(layer.image) ?? null) : null
      return new ImageLayerRenderer(layer, tex, ctx)
    }

    case 'objectgroup':
      return new ObjectLayerRenderer(layer, tilesets, ctx)

    case 'group':
      return new GroupLayerRenderer(layer, tilesets, ctx, imageTextures)
  }
}
