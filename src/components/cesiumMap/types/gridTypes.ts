import * as Cesium from 'cesium'

export interface VoxelGridOptions {
    lon: number              // 原点经度
    lat: number              // 原点纬度
    baseHeight: number       // 原点高度（米）
    voxelSize: number        // 单个体素尺寸（米）
    countX: number           // 东向数量
    countY: number           // 北向数量
    countZ: number           // 高度层数
    color?: Cesium.Color
    /** 高亮线框颜色，默认亮黄 */
    highlightColor?: Cesium.Color
}

export class VoxelGrid {
    private viewer: Cesium.Viewer
    private primitive: Cesium.Primitive | null = null
    /** 单格高亮用 Entity（半透明实体 + 轮廓），避免与线框主网格 z-fighting 导致看不见 */
    private highlightEntity: Cesium.Entity | null = null
    /** 最近一次 create 的完整参数，用于定位体素与高亮 */
    private gridOptions: VoxelGridOptions | null = null

    constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer
    }

    /** 当前网格体素数量（未创建时为空） */
    getVoxelCounts(): { countX: number; countY: number; countZ: number } | null {
        if (!this.gridOptions) return null
        const { countX, countY, countZ } = this.gridOptions
        return { countX, countY, countZ }
    }

    /**
     * 高亮指定索引的体素（东/北/上 为 x/y/z，从 0 起）。
     * 与主网格使用同一 ENU 原点与体素尺寸；重复调用会切换高亮到新的体素。
     */
    setHighlightedVoxel(ix: number, iy: number, iz: number): boolean {
        if (!this.gridOptions) return false
        const { countX, countY, countZ, voxelSize, lon, lat, baseHeight, highlightColor } =
            this.gridOptions
        if (
            ix < 0 ||
            ix >= countX ||
            iy < 0 ||
            iy >= countY ||
            iz < 0 ||
            iz >= countZ
        ) {
            return false
        }

        this.removeHighlightEntity()

        const origin = Cesium.Cartesian3.fromDegrees(lon, lat, baseHeight)
        const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(origin)
        const centerEnu = new Cesium.Cartesian3(
            ix * voxelSize,
            iy * voxelSize,
            iz * voxelSize
        )
        const centerWorld = Cesium.Matrix4.multiplyByPoint(
            enuTransform,
            centerEnu,
            new Cesium.Cartesian3()
        )

        const hiColor = highlightColor ?? Cesium.Color.YELLOW
        /** 略大于体素，减少与主网格共面线段的深度冲突 */
        const dim = voxelSize * 1.04
        const enuAtCenter =
            Cesium.Transforms.eastNorthUpToFixedFrame(centerWorld)
        const rotation = Cesium.Matrix4.getRotation(
            enuAtCenter,
            new Cesium.Matrix3()
        )
        const orientation = Cesium.Quaternion.fromRotationMatrix(rotation)

        this.highlightEntity = this.viewer.entities.add({
            position: centerWorld,
            orientation,
            box: {
                dimensions: new Cesium.Cartesian3(dim, dim, dim),
                fill: true,
                material: hiColor.withAlpha(0.42),
                outline: true,
                outlineColor: hiColor.brighten(0.15, new Cesium.Color()),
                outlineWidth: 2
            }
        })
        /** 始终压过地形/同深度几何，避免单格高亮被挡（Cesium 运行期属性，类型定义未收录） */
        ;(this.highlightEntity as Cesium.Entity & { disableDepthTestDistance?: number }).disableDepthTestDistance =
            Number.POSITIVE_INFINITY
        return true
    }

    clearVoxelHighlight() {
        this.removeHighlightEntity()
    }

    private removeHighlightEntity() {
        if (this.highlightEntity) {
            this.viewer.entities.remove(this.highlightEntity)
            this.highlightEntity = null
        }
    }

    create(options: VoxelGridOptions) {
        this.clear()

        const {
            lon,
            lat,
            baseHeight,
            voxelSize,
            countX,
            countY,
            countZ,
            color
        } = options

        this.gridOptions = { ...options }

        /** 1️⃣ 原点（世界坐标） */
        const origin = Cesium.Cartesian3.fromDegrees(
            lon,
            lat,
            baseHeight
        )

        /** 2️⃣ ENU 坐标系变换矩阵（关键） */
        const enuTransform =
            Cesium.Transforms.eastNorthUpToFixedFrame(origin)

        /** 3️⃣ 单个立方体线框（主网格实例共用） */
        const boxGeometry = Cesium.BoxOutlineGeometry.fromDimensions({
            dimensions: new Cesium.Cartesian3(
                voxelSize,
                voxelSize,
                voxelSize
            )
        })

        const instances: Cesium.GeometryInstance[] = []

        /** 4️⃣ 构建体素实例 */
        for (let x = 0; x < countX; x++) {
            for (let y = 0; y < countY; y++) {
                for (let z = 0; z < countZ; z++) {

                    const translation = new Cesium.Cartesian3(
                        x * voxelSize,
                        y * voxelSize,
                        z * voxelSize
                    )

                    const modelMatrix =
                        Cesium.Matrix4.multiplyByTranslation(
                            enuTransform,
                            translation,
                            new Cesium.Matrix4()
                        )

                    const cellColor =
                        color ?? Cesium.Color.CYAN.withAlpha(0.02)
                    instances.push(
                        new Cesium.GeometryInstance({
                            geometry: boxGeometry,
                            modelMatrix,
                            attributes: {
                                color:
                                    Cesium.ColorGeometryInstanceAttribute.fromColor(
                                        cellColor
                                    )
                            }
                        })
                    )
                }
            }
        }

        /** 5️⃣ 使用 Primitive 一次性提交 GPU */
        this.primitive = new Cesium.Primitive({
            geometryInstances: instances,
            appearance: new Cesium.PerInstanceColorAppearance({
                flat: true,
                translucent: false
            }),
            asynchronous: true
        })
        this.viewer.scene.primitives.add(this.primitive)
    }

    clear() {
        this.removeHighlightEntity()
        if (this.primitive) {
            this.viewer.scene.primitives.remove(this.primitive)
            this.primitive = null
        }
        this.gridOptions = null
    }
}
