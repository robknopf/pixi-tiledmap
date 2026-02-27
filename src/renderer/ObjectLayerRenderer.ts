import { Container, Graphics, Sprite, Text } from 'pixi.js'
import type { ResolvedObjectLayer, TiledObject, TiledText, TiledPoint } from '../types'
import type { TileSetRenderer } from './TileSetRenderer.js'
import type { MapContext } from './tilePlacement.js'
import { decodeGid } from '../parser'
import { parseTintColor } from './parseColor.js'

export class ObjectLayerRenderer extends Container {
  readonly layerData: ResolvedObjectLayer
  private readonly _ctx: MapContext

  constructor(layerData: ResolvedObjectLayer, tilesets: TileSetRenderer[], ctx: MapContext) {
    super()

    this.layerData = layerData
    this._ctx = ctx
    this.label = layerData.name
    this.alpha = layerData.opacity
    this.visible = layerData.visible
    this.position.set(layerData.offsetx, layerData.offsety)
    if (layerData.tintcolor) {
      this.tint = parseTintColor(layerData.tintcolor)
    }

    this._buildObjects(tilesets)
  }

  private _buildObjects(tilesets: TileSetRenderer[]): void {
    for (const obj of this.layerData.objects) {
      const child = this._createObject(obj, tilesets)
      if (child) {
        child.label = obj.name || `object_${obj.id}`
        this.addChild(child)
      }
    }
  }

  private _createObject(obj: TiledObject, tilesets: TileSetRenderer[]): Container | null {
    // Tile object (has gid)
    if (obj.gid !== undefined) {
      return this._createTileObject(obj, tilesets)
    }

    // Text object
    if (obj.text) {
      return this._createTextObject(obj)
    }

    // Shape objects
    if (obj.ellipse) {
      return this._createEllipse(obj)
    }

    if (obj.point) {
      return this._createPoint(obj)
    }

    if (obj.polygon) {
      return this._createPolygon(obj, obj.polygon, true)
    }

    if (obj.polyline) {
      return this._createPolygon(obj, obj.polyline, false)
    }

    // Rectangle (default)
    if (obj.width > 0 && obj.height > 0) {
      return this._createRectangle(obj)
    }

    return null
  }

  private _createTileObject(obj: TiledObject, tilesets: TileSetRenderer[]): Sprite | null {
    if (obj.gid === undefined) return null

    const decoded = decodeGid(obj.gid)
    if (!decoded) return null

    // Find the right tileset
    for (let i = tilesets.length - 1; i >= 0; i--) {
      const ts = tilesets[i]
      if (!ts) continue
      if (ts.tileset.firstgid <= decoded.gid) {
        const localId = decoded.gid - ts.tileset.firstgid
        const texture = ts.getTexture(localId)
        if (!texture) return null

        const sprite = new Sprite(texture)
        const pos = this._project(obj.x, obj.y)
        const halfW = this._ctx.tilewidth * 0.5
        sprite.position.set(pos.x - halfW, pos.y - obj.height)
        sprite.width = obj.width
        sprite.height = obj.height
        sprite.angle = obj.rotation
        sprite.visible = obj.visible

        if (decoded.horizontalFlip) {
          sprite.scale.x *= -1
          sprite.anchor.x = 1
        }
        if (decoded.verticalFlip) {
          sprite.scale.y *= -1
          sprite.anchor.y = 1
        }

        return sprite
      }
    }
    return null
  }

  private _createTextObject(obj: TiledObject): Container {
    const td = obj.text as TiledText
    const text = new Text({
      text: td.text,
      style: {
        fontFamily: td.fontfamily ?? 'sans-serif',
        fontSize: td.pixelsize ?? 16,
        fill: td.color ?? '#000000',
        fontWeight: td.bold ? 'bold' : 'normal',
        fontStyle: td.italic ? 'italic' : 'normal',
        wordWrap: td.wrap ?? false,
        wordWrapWidth: obj.width,
        align: td.halign ?? 'left'
      }
    })
    const pos = this._project(obj.x, obj.y)
    text.position.set(pos.x, pos.y)
    text.angle = obj.rotation
    text.visible = obj.visible
    return text
  }

  private _createRectangle(obj: TiledObject): Container {
    const g = new Graphics()
    this._drawProjectedRect(g, obj.width, obj.height)
    const pos = this._project(obj.x, obj.y)
    g.position.set(pos.x, pos.y)
    g.angle = obj.rotation
    g.visible = obj.visible
    return g
  }

  private _createEllipse(obj: TiledObject): Container {
    const g = new Graphics()
    this._drawProjectedEllipse(g, obj.width, obj.height)
    const pos = this._project(obj.x, obj.y)
    g.position.set(pos.x, pos.y)
    g.angle = obj.rotation
    g.visible = obj.visible
    return g
  }

  private _createPoint(obj: TiledObject): Container {
    const g = new Graphics().circle(0, 0, 3).fill(0xffffff)
    const pos = this._project(obj.x, obj.y)
    g.position.set(pos.x, pos.y)
    g.visible = obj.visible
    return g
  }

  private _createPolygon(obj: TiledObject, points: TiledPoint[], closed: boolean): Container {
    const g = new Graphics()

    if (points.length > 0) {
      const first = points[0]!
      const firstProjected = this._project(first.x, first.y)
      g.moveTo(firstProjected.x, firstProjected.y)
      for (let i = 1; i < points.length; i++) {
        const pt = points[i]!
        const projected = this._project(pt.x, pt.y)
        g.lineTo(projected.x, projected.y)
      }
      if (closed) {
        g.closePath()
      }
      g.stroke({ color: 0xffffff, width: 1 })
    }

    const pos = this._project(obj.x, obj.y)
    g.position.set(pos.x, pos.y)
    g.angle = obj.rotation
    g.visible = obj.visible
    return g
  }

  private _project(x: number, y: number): { x: number; y: number } {
    if (this._ctx.orientation !== 'isometric') {
      return { x, y }
    }

    const halfW = this._ctx.tilewidth * 0.5
    const halfH = this._ctx.tileheight * 0.5
    return {
      x: x - y,
      y: (x + y) * (halfH / halfW)
    }
  }

  private _drawProjectedRect(graphics: Graphics, width: number, height: number): void {
    const p0 = this._project(0, 0)
    const p1 = this._project(width, 0)
    const p2 = this._project(width, height)
    const p3 = this._project(0, height)
    graphics
      .moveTo(p0.x, p0.y)
      .lineTo(p1.x, p1.y)
      .lineTo(p2.x, p2.y)
      .lineTo(p3.x, p3.y)
      .closePath()
      .stroke({ color: 0xffffff, width: 1 })
  }

  private _drawProjectedEllipse(graphics: Graphics, width: number, height: number): void {
    const cx = width * 0.5
    const cy = height * 0.5
    const rx = width * 0.5
    const ry = height * 0.5
    const segments = 24

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2
      const px = cx + Math.cos(t) * rx
      const py = cy + Math.sin(t) * ry
      const projected = this._project(px, py)
      if (i === 0) {
        graphics.moveTo(projected.x, projected.y)
      } else {
        graphics.lineTo(projected.x, projected.y)
      }
    }

    graphics.closePath().stroke({ color: 0xffffff, width: 1 })
  }
}
