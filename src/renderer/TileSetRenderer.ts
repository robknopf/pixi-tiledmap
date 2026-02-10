import { Rectangle, Texture } from 'pixi.js'
import type { ResolvedTileset, TiledTileDefinition } from '../types'

export class TileSetRenderer {
  readonly tileset: ResolvedTileset
  readonly baseTexture: Texture | null
  private readonly _textureCache = new Map<number, Texture>()

  constructor(tileset: ResolvedTileset, baseTexture: Texture | null) {
    this.tileset = tileset
    this.baseTexture = baseTexture
  }

  getTexture(localId: number): Texture | null {
    const cached = this._textureCache.get(localId)
    if (cached) return cached

    const tileDef = this.tileset.tiles.get(localId)

    // Image-collection tileset: each tile has its own image (loaded separately)
    if (tileDef?.image) {
      // For image-collection tilesets, textures must be supplied externally
      // via setTileTexture(). Return null here.
      return null
    }

    // Single-image tileset: cut sub-rectangle from baseTexture
    if (!this.baseTexture) return null

    const { tilewidth, tileheight, columns, margin, spacing } = this.tileset
    if (columns <= 0) return null

    const col = localId % columns
    const row = Math.floor(localId / columns)
    const x = margin + col * (tilewidth + spacing)
    const y = margin + row * (tileheight + spacing)

    const frame = new Rectangle(x, y, tilewidth, tileheight)
    const texture = new Texture({ source: this.baseTexture.source, frame })

    this._textureCache.set(localId, texture)
    return texture
  }

  setTileTexture(localId: number, texture: Texture): void {
    this._textureCache.set(localId, texture)
  }

  getAnimationFrames(localId: number): TiledTileDefinition['animation'] | undefined {
    return this.tileset.tiles.get(localId)?.animation
  }

  destroy(): void {
    for (const tex of this._textureCache.values()) {
      tex.destroy()
    }
    this._textureCache.clear()
  }
}
