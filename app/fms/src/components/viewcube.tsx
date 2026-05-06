import { React } from 'uweb'

const { useRef, useEffect } = React

import type { Map as MaptalksMap } from "maptalks";

interface ViewCubeProps {
    map: MaptalksMap;
}

const SIZE = 40; // 2x smaller
const HALF = SIZE / 2;

const MaptalksViewCube = (cfg: iArgs) => {

    const cubeRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {

        const map = cfg.MapView?.map; // Access map from props

        if (!map || !cubeRef.current) return;

        const cube = cubeRef.current;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentBearing = map.getBearing();
        let currentPitch = map.getPitch();

        const updateCube = () => {
            cube.style.transform =
                `rotateX(${-map.getPitch()}deg) rotateY(${map.getBearing()}deg)`;
        };

        // CLICK SNAP
        const handleClick = (e: MouseEvent) => {
            if (isDragging) return;

            const target = e.target as HTMLElement;
            const view = target.dataset.view;
            if (!view) return;

            const viewMap: Record<string, any> = {
                front: { bearing: 0, pitch: 45 },
                back: { bearing: 180, pitch: 45 },
                left: { bearing: -90, pitch: 45 },
                right: { bearing: 90, pitch: 45 },
                top: { pitch: 0 }
            };

            map.animateTo(viewMap[view], { duration: 300 });
        };

        // DRAG START
        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            currentBearing = map.getBearing();
            currentPitch = map.getPitch();
        };

        // DRAG MOVE
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const newBearing = currentBearing + deltaX * 0.5;
            const newPitch = Math.max(
                0,
                Math.min(80, currentPitch - deltaY * 0.3)
            );

            map.setBearing(newBearing);
            map.setPitch(newPitch);
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        cube.addEventListener("click", handleClick);
        cube.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        map.on("rotate pitch", updateCube);
        updateCube();

        const edit = (editing: boolean) => map.animateTo({ bearing: 0, pitch: editing ? 0 : 45 }, { duration: 300 })

        cfg.event.on("map:edit", edit)

        return () => {
            cube.removeEventListener("click", handleClick);
            cube.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            map.off("rotate pitch", updateCube);
            cfg.event.off("map:edit", edit)
        };

    }, [cfg.MapView?.map]);

    return (
        <div
            style={{
                position: "absolute",
                bottom: 50,
                right: 10,
                width: SIZE,
                height: SIZE,
                perspective: 700,
                zIndex: 1000
            }}
        >
            <div
                ref={cubeRef}
                style={{
                    width: SIZE,
                    height: SIZE,
                    position: "relative",
                    transformStyle: "preserve-3d",
                    transition: "transform 0.2s ease"
                }}
            >
                <Face view="front" label="F" transform={`translateZ(${HALF}px)`} />
                <Face view="back" label="B" transform={`rotateY(180deg) translateZ(${HALF}px)`} />
                <Face view="left" label="L" transform={`rotateY(-90deg) translateZ(${HALF}px)`} />
                <Face view="right" label="R" transform={`rotateY(90deg) translateZ(${HALF}px)`} />
                <Face view="top" label="T" transform={`rotateX(90deg) translateZ(${HALF}px)`} />
            </div>
        </div>
    );
};

interface FaceProps {
    label: string;
    view: string;
    transform: string;
}

const Face: React.FC<FaceProps> = ({ label, view, transform }) => (
    <div
        data-view={view}
        style={{
            position: "absolute",
            width: SIZE,
            height: SIZE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(50,50,50,0.95)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid #666",
            backfaceVisibility: "hidden",
            transform,
            userSelect: "none",
            cursor: "grab"
        }}
    >
        {label}
    </div>
);

export default MaptalksViewCube;