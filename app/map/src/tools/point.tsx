import { React, Typography } from 'uweb'
import { MapView, maptalks } from 'uweb/maptalks'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Safe } from 'utils/web'
import { THREE } from 'uweb/three'
import { useEffect } from 'react'

export const Points = () => {

    useEffect(() => {

        Safe(async () => {

            const { Pane } = await import('tweakpane')

            /* Safe(() => {

                const pane = new Pane()
                pane.addButton({ title: 'Previous' });
                pane.addButton({ title: 'Next' });
                pane.addButton({ title: 'Reset' });

            }) */

            Safe(() => {

                console.log(Pane)

                const PARAMS = {
                    background: { r: 255, g: 0, b: 55 },
                    tint: { r: 0, g: 255, b: 214, a: 0.5 },
                };

                const pane = new Pane({ title: 'Point Material' });
                pane.addBinding(PARAMS, 'background');
                pane.addBinding(PARAMS, 'tint');

            })

        })

    }, [])

    return null

}

const { Paragraph } = Typography

type HexColor = `#${string}`;

interface ElevationColorOptions {
    /**
     * Recommended: pass true if the cell/pixel is water.
     * If omitted, you can use waterline to auto-classify low elevations as water.
     */
    isWater?: boolean;

    /**
     * If provided (e.g., 12), elevations <= waterline will be treated as water
     * ONLY when isWater is not explicitly true/false.
     */
    waterline?: number | null;
}

interface Rgb {
    r: number;
    g: number;
    b: number;
}

interface ColorStop {
    /** Position in [0,1] */
    t: number;
    /** Hex color like "#AABBCC" */
    c: HexColor;
}

/**
 * Realistic hypsometric tint for normalized elevation (1..100).
 * - Water: deep blue -> shallow light blue
 * - Land: greens -> soil/tan -> rock/brown -> coal/dark -> snow/white
 */
export function elevationColor(elevation: number, opts: ElevationColorOptions = {}): HexColor {
    const isWater: boolean = opts.isWater ?? false;
    const waterline: number | null | undefined = opts.waterline;

    // Validate + clamp
    if (!Number.isFinite(elevation)) {
        throw new Error("Elevation must be a finite number.");
    }
    const eClamped: number = Math.max(1, Math.min(100, elevation));
    const t: number = (eClamped - 1) / 99; // normalize to 0..1

    // Helpers
    const lerp = (a: number, b: number, x: number): number => a + (b - a) * x;

    const hexToRgb = (hex: HexColor): Rgb => {
        const h: string = hex.replace("#", "").trim();
        if (h.length !== 6) throw new Error(`Invalid hex color: ${hex}`);
        return {
            r: parseInt(h.slice(0, 2), 16),
            g: parseInt(h.slice(2, 4), 16),
            b: parseInt(h.slice(4, 6), 16),
        };
    };

    const rgbToHex = (rgb: Rgb): HexColor => {
        const toHex = (v: number): string => {
            const clamped: number = Math.max(0, Math.min(255, v));
            return Math.round(clamped).toString(16).padStart(2, "0");
        };
        return (`#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase()) as HexColor;
    };

    const mix = (c1: HexColor, c2: HexColor, x: number): HexColor => {
        const A: Rgb = hexToRgb(c1);
        const B: Rgb = hexToRgb(c2);
        return rgbToHex({
            r: lerp(A.r, B.r, x),
            g: lerp(A.g, B.g, x),
            b: lerp(A.b, B.b, x),
        });
    };

    const ramp = (stops: readonly ColorStop[], x: number): HexColor => {
        if (stops.length === 0) throw new Error("Color ramp must have at least 1 stop.");

        if (x <= stops[0].t) return stops[0].c;
        const last: ColorStop = stops[stops.length - 1];
        if (x >= last.t) return last.c;

        for (let i = 0; i < stops.length - 1; i++) {
            const a: ColorStop = stops[i];
            const b: ColorStop = stops[i + 1];
            if (x >= a.t && x <= b.t) {
                const span: number = b.t - a.t;
                const local: number = span === 0 ? 0 : (x - a.t) / span;
                return mix(a.c, b.c, local);
            }
        }
        return last.c;
    };

    // Auto-water if waterline is provided AND isWater wasn't explicitly set true
    // (Note: if you want "isWater: false" to override waterline, keep this logic.)
    const autoWater: boolean =
        (waterline != null) && (opts.isWater == null) && (eClamped <= waterline);

    // WATER palette (deep -> shallow)
    if (isWater || autoWater) {
        const waterStops: readonly ColorStop[] = [
            { t: 0.00, c: "#08306B" },
            { t: 0.35, c: "#08519C" },
            { t: 0.70, c: "#2B8CBE" },
            { t: 1.00, c: "#A6CEE3" },
        ];
        return ramp(waterStops, t);
    }

    // LAND palette (vegetation -> soil -> rock -> coal -> snow)
    const landStops: readonly ColorStop[] = [
        // lowland greens
        { t: 0.00, c: "#0B3D0B" },
        { t: 0.18, c: "#1B7F1B" },
        { t: 0.32, c: "#7FC97F" },

        // soil / dry grass
        { t: 0.45, c: "#C2B280" },
        { t: 0.56, c: "#D9C38C" },

        // rocky / coal-like darker terrain
        { t: 0.68, c: "#8C6D31" },
        { t: 0.78, c: "#5A4A42" },
        { t: 0.86, c: "#2F2F2F" },

        // alpine + snow
        { t: 0.93, c: "#BDBDBD" },
        { t: 1.00, c: "#FFFFFF" },
    ];
    return ramp(landStops, t);
}

export const coloredMaterial = () => {

    const doc: any = document ?? {}

    var material = new THREE.ShaderMaterial({
        vertexShader: doc.getElementById('vertexshader').textContent,
        fragmentShader: doc.getElementById('fragmentshader').textContent,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        depthTest: true, //深度测试关闭，不消去场景的不可见面
        sizeAttenuation: false,
        // sizeAttenuation: false
        blending: THREE.AdditiveBlending,
    })

    return material

}

function createLightMateria() {

    const canvasDom = document.createElement('canvas');
    const size = 16;
    canvasDom.width = size;
    canvasDom.height = size;
    const ctx: any = canvasDom.getContext('2d');
    const gradient = ctx.createRadialGradient(
        canvasDom.width / 2,
        canvasDom.height / 2,
        0,
        canvasDom.width / 2,
        canvasDom.height / 2,
        canvasDom.width / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.005, 'rgba(139,69,19,1)');
    gradient.addColorStop(0.4, 'rgba(139,69,19,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,1)');

    ctx.fillStyle = gradient;
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // ctx.fillRect(0, 0, canvasDom.width, canvasDom.height);

    const texture = new THREE.Texture(canvasDom);
    texture.needsUpdate = true; //使用贴图时进行更新
    return texture;
}

export const material = new THREE.PointsMaterial({
    // size: 10,
    sizeAttenuation: false,
    // color: 'red',
    // alphaTest: 0.5,
    // vertexColors: THREE.VertexColors,
    //  transparent: true
    // color: 0xffffff,
    size: 2,
    transparent: true, //使材质透明
    blending: THREE.AdditiveBlending,
    depthTest: true, //深度测试关闭，不消去场景的不可见面
    depthWrite: false,
    map: createLightMateria() //刚刚创建的粒子贴图就在这里用上
});

const color = '#fff'

const crateTexture = (fillStyle: any) => {

    const size = 1
    const canvasDom = document.createElement('canvas');
    canvasDom.width = size;
    canvasDom.height = size;
    const ctx: any = canvasDom.getContext('2d');
    ctx.fillStyle = fillStyle || color;
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    const texture = new THREE.Texture(canvasDom);
    texture.needsUpdate = true; //使用贴图时进行更新
    return texture;

}


export const createMaterial = (fillStyle: any) => new THREE.PointsMaterial({
    // size: 10,
    sizeAttenuation: false,
    // color: 'red',
    // alphaTest: 0.5,
    // vertexColors: THREE.VertexColors,
    //  transparent: true
    // color: 0xffffff,
    size: 1,
    transparent: true, //使材质透明
    blending: THREE.AdditiveBlending,
    depthTest: true, //深度测试关闭，不消去场景的不可见面
    depthWrite: false,
    map: crateTexture(fillStyle)
})

export class PointTool {

    Maptalks: MapView
    cfg: iArgs
    tool: any

    constructor(Maptalks: MapView, cfg: iArgs, message: any) {

        const als = `distance.tool`
        this.Maptalks = Maptalks
        this.cfg = cfg

        const { event } = cfg

        this.setup()

        const close = () => {
            if (this.tool.isEnabled()) {
                // message.open({ key: als, type: 'loading', content: 'Clearing ...', duration: 0.5 })
                message.destroy(als)
                this.tool.clear()
                this.tool.disable()
            }
        }

        event.on(`${als}.enable`, (n) => {

            event.emit('tools.close', true)

            message.open({
                key: als,
                duration: 0,
                content: <Paragraph
                    style={{ padding: 0, margin: 0 }}
                    copyable={{ icon: <CloseCircleOutlined />, tooltips: ['Close', 'Closed'], onCopy: () => close() }}
                >Distance Tool</Paragraph>
            })

            this.tool.enable()

        })

        event.on(`${als}.disable`, (n) => this.tool.disable())
        event.on('tools.close', () => close())

    }

    setup = () => {

        this.tool = new maptalks.DistanceTool({

            'language': 'en-US',
            'symbol': {
                'lineColor': '#34495e',
                'lineWidth': 2
            },
            'vertexSymbol': {
                'markerType': 'ellipse',
                'markerFill': '#1bbc9b',
                'markerLineColor': '#000',
                'markerLineWidth': 3,
                'markerWidth': 10,
                'markerHeight': 10
            },

            'labelOptions': {
                'textSymbol': {
                    'textFaceName': 'monospace',
                    'textFill': '#fff',
                    'textLineSpacing': 1,
                    'textHorizontalAlignment': 'right',
                    'textDx': 15,
                    'markerLineColor': '#b4b3b3',
                    'markerFill': '#000'
                },
                'boxStyle': {
                    'padding': [6, 2],
                    'symbol': {
                        'markerType': 'square',
                        'markerFill': '#000',
                        'markerFillOpacity': 0.9,
                        'markerLineColor': '#b4b3b3'
                    }
                }
            },
            'clearButtonSymbol': [{
                'markerType': 'square',
                'markerFill': '#000',
                'markerLineColor': '#b4b3b3',
                'markerLineWidth': 2,
                'markerWidth': 15,
                'markerHeight': 15,
                'markerDx': 20
            }, {
                'markerType': 'x',
                'markerWidth': 10,
                'markerHeight': 10,
                'markerLineColor': '#fff',
                'markerDx': 20
            }],

        }).addTo(this.Maptalks.map).disable()

        this.tool.on('drawend', (param: any) => { })

    }

}