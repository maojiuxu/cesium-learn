import { useMapStore } from '@/stores/modules/mapStore'
import * as Cesium from 'cesium'
import { VoxelGrid } from '../types/gridTypes'
import { shallowRef } from 'vue'


export function gridConfig() {

    const mapStore = useMapStore()

    //#region 二维平面网格
    const gridEntities: Cesium.Entity[] = []

    const createGridEffect = (options: {
        west: number
        south: number
        east: number
        north: number
        step: number
        height: number
        }) => {
            const map = mapStore.getMap()
            if(!map){
                console.log('地图实例不存在');
                return
            }

            const { west, south, east, north, step, height } = options

            const material = new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.CYAN.withAlpha(0.6)
            })

            // 横向纬线
            for (let lat = south; lat <= north; lat += step) {
                const entity = map.entities.add({
                polyline: {
                    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                    west, lat, height,
                    east, lat, height
                    ]),
                    width: 1.5,
                    material
                }
                })
                gridEntities.push(entity)
            }

            // 纵向经线
            for (let lon = west; lon <= east; lon += step) {
                const entity = map.entities.add({
                polyline: {
                    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                    lon, south, height,
                    lon, north, height
                    ]),
                    width: 1.5,
                    material
                }
                })
                gridEntities.push(entity)
            }

    }

    /**
     * 清除网格
     */
    const clearAirGrid = () => {
        const map = mapStore.getMap()
        if(!map){
            console.log('地图实例不存在');
            return
        }
        gridEntities.forEach(e => map!.entities.remove(e))
        gridEntities.length = 0
    }

    //#endregion

    //#region 三维网格
    let voxelGrid = shallowRef<VoxelGrid | null>(null)

    const create3DVoxelGrid = () => {
        const map = mapStore.getMap()
        if(!map){
            console.log('地图实例不存在');
            return
        }

        map.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
            116.7,
            31.7,
            30000
            )
        })

        voxelGrid.value = new VoxelGrid(map)

        /**
         * 示例配置：
         * 100m 网格
         * 10km × 10km × 5km
         */
        voxelGrid.value.create({
            lon: 116.65,
            lat: 31.65,
            baseHeight: 0,
            voxelSize: 1000,   // 🔥 100 / 500 / 1000 可切换
            countX: 10,       // 20 × 500m = 10km
            countY: 10,
            countZ: 10,       // 10 × 500m = 5km
            color: Cesium.Color.CYAN.withAlpha(0.02)
        })

    }

    //#endregion



    return {
        createGridEffect,
        clearAirGrid,
        create3DVoxelGrid,
        voxelGrid
    }
}