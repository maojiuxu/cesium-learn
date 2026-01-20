import { useMapStore } from '@/stores/modules/mapStore'
import * as Cesium from 'cesium'


export function gridConfig() {

    const mapStore = useMapStore()
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
    return {
        createGridEffect,
        clearAirGrid
    }
}