import { Container, Graphics } from 'pixi.js'
import type { ResolvedMap, TiledMapOptions, MapContext } from '../types'
import { TileSetRenderer } from './TileSetRenderer.js'
import { createLayerRenderer } from './createLayerRenderer.js'
import { parseTintColor } from './parseColor.js'

export class TiledMap extends Container {
  readonly mapData: ResolvedMap
  readonly tileSetRenderers: TileSetRenderer[]

  private _background: Graphics | null = null

  constructor(mapData: ResolvedMap, options?: TiledMapOptions) {
    super()

    this.mapData = mapData
    this.label = 'TiledMap'

    // Build tileset renderers
    const tilesetTextures = options?.tilesetTextures ?? new Map()
    const imageLayerTextures = options?.imageLayerTextures ?? new Map()
    const tileImageTextures = options?.tileImageTextures ?? new Map()

    this.tileSetRenderers = mapData.tilesets.map(ts => {
      const baseTex = ts.image ? (tilesetTextures.get(ts.image) ?? null) : null
      const renderer = new TileSetRenderer(ts, baseTex)

      // Supply individual tile images for image-collection tilesets
      for (const [localId, tileDef] of ts.tiles) {
        if (tileDef.image) {
          const tex = tileImageTextures.get(tileDef.image)
          if (tex) renderer.setTileTexture(localId, tex)
        }
      }

      return renderer
    })

    // Build map context for orientation-aware tile placement
    const ctx: MapContext = {
      orientation: mapData.orientation,
      renderorder: mapData.renderorder,
      mapwidth: mapData.width,
      mapheight: mapData.height,
      tilewidth: mapData.tilewidth,
      tileheight: mapData.tileheight,
      hexsidelength: mapData.hexsidelength,
      staggeraxis: mapData.staggeraxis,
      staggerindex: mapData.staggerindex
    }

    // Render background
    if (mapData.backgroundcolor) {
      this._buildBackground(mapData)
    }

    // Render layers
    for (const layer of mapData.layers) {
      const child = createLayerRenderer(layer, this.tileSetRenderers, ctx, imageLayerTextures)
      if (child) this.addChild(child)
    }
  }

  get orientation() {
    return this.mapData.orientation
  }
  get mapWidth() {
    return this.mapData.width
  }
  get mapHeight() {
    return this.mapData.height
  }
  get tileWidth() {
    return this.mapData.tilewidth
  }
  get tileHeight() {
    return this.mapData.tileheight
  }

  getLayer(name: string): Container | undefined {
    return this.children.find(c => c.label === name) as Container | undefined
  }

  private _buildBackground(mapData: ResolvedMap): void {
    const color = parseTintColor(mapData.backgroundcolor!)
    const pixelWidth = mapData.width * mapData.tilewidth
    const pixelHeight = mapData.height * mapData.tileheight

    this._background = new Graphics().rect(0, 0, pixelWidth, pixelHeight).fill(color)
    this._background.label = 'background'
    this.addChild(this._background)
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    for (const ts of this.tileSetRenderers) {
      ts.destroy()
    }
    super.destroy(options)
  }
}
