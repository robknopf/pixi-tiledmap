import { type Texture, Container, AnimatedSprite, Sprite } from 'pixi.js'
import type {
  ResolvedTileLayer,
  ResolvedTile,
  ResolvedChunk,
  TiledFrame,
  TiledRenderOrder
} from '../types'
import type { TileSetRenderer } from './TileSetRenderer.js'
import { type MapContext, tileToPixel } from './tilePlacement.js'
import { parseTintColor } from './parseColor.js'

export class TileLayerRenderer extends Container {
  readonly layerData: ResolvedTileLayer

  constructor(layerData: ResolvedTileLayer, tilesets: TileSetRenderer[], ctx: MapContext) {
    super()

    this.layerData = layerData
    this.label = layerData.name
    this.alpha = layerData.opacity
    this.visible = layerData.visible
    this.position.set(layerData.offsetx, layerData.offsety)
    if (layerData.tintcolor) {
      this.tint = parseTintColor(layerData.tintcolor)
    }

    if (layerData.infinite && layerData.chunks) {
      this._buildChunks(layerData.chunks, tilesets, ctx)
    } else {
      this._buildTiles(
        layerData.tiles,
        layerData.width,
        Math.floor(layerData.tiles.length / (layerData.width || 1)),
        0,
        0,
        tilesets,
        ctx
      )
    }
  }

  private _buildChunks(
    chunks: ResolvedChunk[],
    tilesets: TileSetRenderer[],
    ctx: MapContext
  ): void {
    for (const chunk of chunks) {
      this._buildTiles(chunk.tiles, chunk.width, chunk.height, chunk.x, chunk.y, tilesets, ctx)
    }
  }

  private _buildTiles(
    tiles: (ResolvedTile | null)[],
    layerWidth: number,
    layerHeight: number,
    originCol: number,
    originRow: number,
    tilesets: TileSetRenderer[],
    ctx: MapContext
  ): void {
    const order = ctx.renderorder

    for (const [col, row] of iterateTiles(layerWidth, layerHeight, order)) {
      const i = row * layerWidth + col
      const tile = tiles[i]
      if (!tile) continue

      const tsRenderer = tilesets[tile.tilesetIndex]
      if (!tsRenderer) continue

      const pos = tileToPixel(originCol + col, originRow + row, ctx)
      const animFrames = tsRenderer.getAnimationFrames(tile.localId)

      if (animFrames && animFrames.length > 1) {
        const sprite = this._createAnimatedTile(tsRenderer, animFrames, tile, pos.x, pos.y, ctx)
        if (sprite) this.addChild(sprite)
      } else {
        const texture = tsRenderer.getTexture(tile.localId)
        if (!texture) continue

        const sprite = new Sprite(texture)
        const baseAnchor = getBaseAnchor(texture, ctx)
        sprite.anchor.set(baseAnchor.x, baseAnchor.y)
        sprite.position.set(pos.x, pos.y)
        applyFlip(sprite, tile, ctx.tilewidth, baseAnchor)
        this.addChild(sprite)
      }
    }
  }

  private _createAnimatedTile(
    tsRenderer: TileSetRenderer,
    frames: TiledFrame[],
    tile: ResolvedTile,
    x: number,
    y: number,
    ctx: MapContext
  ): AnimatedSprite | null {
    const textures: { texture: Texture; time: number }[] = []

    for (const frame of frames) {
      const tex = tsRenderer.getTexture(frame.tileid)
      if (!tex) return null
      textures.push({ texture: tex, time: frame.duration })
    }

    const sprite = new AnimatedSprite(textures)
    const baseAnchor = getBaseAnchor(textures[0]!.texture, ctx)
    sprite.anchor.set(baseAnchor.x, baseAnchor.y)
    sprite.position.set(x, y)
    sprite.play()
    applyFlip(sprite, tile, tsRenderer.tileset.tilewidth, baseAnchor)
    return sprite
  }
}

function* iterateTiles(
  width: number,
  height: number,
  order: TiledRenderOrder
): Generator<[number, number]> {
  const rightToLeft = order === 'left-down' || order === 'left-up'
  const bottomToTop = order === 'right-up' || order === 'left-up'

  const rowStart = bottomToTop ? height - 1 : 0
  const rowEnd = bottomToTop ? -1 : height
  const rowStep = bottomToTop ? -1 : 1

  const colStart = rightToLeft ? width - 1 : 0
  const colEnd = rightToLeft ? -1 : width
  const colStep = rightToLeft ? -1 : 1

  for (let row = rowStart; row !== rowEnd; row += rowStep) {
    for (let col = colStart; col !== colEnd; col += colStep) {
      yield [col, row]
    }
  }
}

function applyFlip(
  sprite: Sprite,
  tile: ResolvedTile,
  tileWidth: number,
  baseAnchor: { x: number; y: number }
): void {
  if (tile.diagonalFlip) {
    sprite.rotation = Math.PI / 2
    sprite.scale.x = tile.horizontalFlip ? -1 : 1
    sprite.scale.y = tile.verticalFlip ? -1 : 1
    sprite.anchor.set(0, 1)
    sprite.position.x += tileWidth
  } else {
    if (tile.horizontalFlip) {
      sprite.scale.x = -1
      sprite.anchor.x = 1 - baseAnchor.x
    }
    if (tile.verticalFlip) {
      sprite.scale.y = -1
      sprite.anchor.y = 1 - baseAnchor.y
    }
  }
}

function getBaseAnchor(texture: Texture, ctx: MapContext): { x: number; y: number } {
  if (ctx.orientation !== 'isometric') {
    return { x: 0, y: 0 }
  }

  const width = Math.max(texture.width, 1)
  const height = Math.max(texture.height, 1)
  const x = clamp((ctx.tilewidth / 2) / width, 0, 1)
  const y = clamp(1 - ctx.tileheight / height, 0, 1)
  return { x, y }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
