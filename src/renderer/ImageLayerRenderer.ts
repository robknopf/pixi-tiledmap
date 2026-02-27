import { type Texture, Container, Sprite, TilingSprite } from 'pixi.js'
import type { MapContext, ResolvedImageLayer } from '../types'
import { parseTintColor } from './parseColor.js'

export class ImageLayerRenderer extends Container {
  readonly layerData: ResolvedImageLayer

  constructor(layerData: ResolvedImageLayer, texture: Texture | null, ctx: MapContext) {
    super()

    this.layerData = layerData
    this.label = layerData.name
    this.alpha = layerData.opacity
    this.visible = layerData.visible
    this.position.set(...this._resolveLayerPosition(ctx))
    if (layerData.tintcolor) {
      this.tint = parseTintColor(layerData.tintcolor)
    }

    if (texture) {
      this._buildImage(texture)
    }
  }

  private _buildImage(texture: Texture): void {
    const { repeatx, repeaty } = this.layerData

    if (repeatx || repeaty) {
      const tiling = new TilingSprite({
        texture,
        width: repeatx ? texture.width * 10 : texture.width,
        height: repeaty ? texture.height * 10 : texture.height
      })
      this.addChild(tiling)
    } else {
      const sprite = new Sprite(texture)
      this.addChild(sprite)
    }
  }

  private _resolveLayerPosition(ctx: MapContext): [number, number] {
    const x = this.layerData.x + this.layerData.offsetx
    const y = this.layerData.y + this.layerData.offsety

    if (ctx.orientation !== 'isometric') {
      return [x, y]
    }

    // Tiled's isometric editor space has origin at the top-left of the map bounds,
    // while tile rendering in this renderer uses the map's top center as x=0.
    // Normalize image layers into the same coordinate frame as tile layers.
    const isoX = x - ctx.mapheight * (ctx.tilewidth / 2)
    return [isoX, y]
  }
}
