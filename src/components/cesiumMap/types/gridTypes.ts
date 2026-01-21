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
}

export class VoxelGrid {
    private viewer: Cesium.Viewer
    private primitive: Cesium.Primitive | null = null

    constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer
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

        /** 1️⃣ 原点（世界坐标） */
        const origin = Cesium.Cartesian3.fromDegrees(
            lon,
            lat,
            baseHeight
        )

        /** 2️⃣ ENU 坐标系变换矩阵（关键） */
        const enuTransform =
            Cesium.Transforms.eastNorthUpToFixedFrame(origin)

        /** 3️⃣ 单个立方体几何（只创建一次） */
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

                    instances.push(
                        new Cesium.GeometryInstance({
                            geometry: boxGeometry,
                            modelMatrix,
                            attributes: {
                                color:
                                    Cesium.ColorGeometryInstanceAttribute.fromColor(color)
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
        if (this.primitive) {
            this.viewer.scene.primitives.remove(this.primitive)
            this.primitive = null
        }
    }
}
