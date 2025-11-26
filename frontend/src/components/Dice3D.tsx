import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface Dice3DProps {
    value: number | null;
    rolling?: boolean;
    delay?: number;
    size?: number;
}

export function Dice3D({ value, rolling = false, delay = 0, size = 80 }: Dice3DProps) {
    const [displayValue, setDisplayValue] = useState<number | null>(value);
    const [isRolling, setIsRolling] = useState(rolling);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (rolling) {
            setIsRolling(true);
            const interval = setInterval(() => {
                setRotation({
                    x: Math.random() * 720,
                    y: Math.random() * 720,
                });
                setDisplayValue(Math.floor(Math.random() * 6) + 1);
            }, 100);
            
            const stopTimeout = setTimeout(() => {
                clearInterval(interval);
                setIsRolling(false);
                setDisplayValue(value);
                
                // Set fixed rotation based on value
                let x = 0;
                let y = 0;
                
                if (value !== null && value >= 1 && value <= 6) {
                    switch (value) {
                        case 1: x = 0; y = 0; break;
                        case 6: x = 180; y = 0; break;
                        case 2: x = -90; y = 0; break;
                        case 5: x = 90; y = 0; break;
                        case 3: x = 0; y = -90; break;
                        case 4: x = 0; y = 90; break;
                    }
                }
                
                setRotation({ x: x + 720, y: y + 720 });
            }, 1000 + delay);

            return () => {
                clearInterval(interval);
                clearTimeout(stopTimeout);
            };
        } else {
            setDisplayValue(value);
            setIsRolling(false);
            
            // Set fixed rotation based on value
            let x = 0;
            let y = 0;
            
            if (value !== null && value >= 1 && value <= 6) {
                switch (value) {
                    case 1: x = 0; y = 0; break;
                    case 6: x = 180; y = 0; break;
                    case 2: x = -90; y = 0; break;
                    case 5: x = 90; y = 0; break;
                    case 3: x = 0; y = -90; break;
                    case 4: x = 0; y = 90; break;
                }
                // Add slight angle to show 3D effect
                setRotation({ x: x + 15, y: y + 15 });
            } else {
                setRotation({ x, y });
            }
        }
    }, [value, rolling, delay]);

    const translateZ = size / 2;

    return (
        <div className="flex flex-col items-center">
            <div 
                className="perspective-1000"
                style={{ width: size, height: size }}
            >
                <div 
                    className="relative w-full h-full preserve-3d transition-transform duration-700 ease-out"
                    style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
                >
                    {/* Face 1 */}
                    <div className="dice-face" style={{ transform: `translateZ(${translateZ}px)` }}>
                        <div className="dot red" />
                    </div>

                    {/* Face 6 */}
                    <div className="dice-face" style={{ transform: `rotateY(180deg) translateZ(${translateZ}px)` }}>
                        <div className="grid grid-cols-2 gap-1">
                            <div className="dot"/><div className="dot"/><div className="dot"/><div className="dot"/><div className="dot"/><div className="dot"/>
                        </div>
                    </div>

                    {/* Face 2 */}
                    <div className="dice-face" style={{ transform: `rotateX(90deg) translateZ(${translateZ}px)` }}>
                        <div className="flex flex-col justify-between h-1/2">
                            <div className="dot self-start"/>
                            <div className="dot self-end"/>
                        </div>
                    </div>

                    {/* Face 5 */}
                    <div className="dice-face" style={{ transform: `rotateX(-90deg) translateZ(${translateZ}px)` }}>
                        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full p-3">
                            <div className="dot"/><div></div><div className="dot"/>
                            <div></div><div className="dot"/><div></div>
                            <div className="dot"/><div></div><div className="dot"/>
                        </div>
                    </div>

                    {/* Face 3 */}
                    <div className="dice-face" style={{ transform: `rotateY(90deg) translateZ(${translateZ}px)` }}>
                        <div className="flex flex-col justify-between h-2/3">
                            <div className="dot self-start"/>
                            <div className="dot self-center"/>
                            <div className="dot self-end"/>
                        </div>
                    </div>

                    {/* Face 4 */}
                    <div className="dice-face" style={{ transform: `rotateY(-90deg) translateZ(${translateZ}px)` }}>
                        <div className="grid grid-cols-2 gap-3 w-1/2 h-1/2">
                            <div className="dot red"/><div className="dot red"/>
                            <div className="dot red"/><div className="dot red"/>
                        </div>
                    </div>
                </div>
            </div>
            {displayValue !== null && (
                <div className={clsx(
                    "mt-2 text-sm font-bold text-white text-center min-h-[20px]",
                    isRolling && "opacity-50"
                )}>
                    {displayValue}
                </div>
            )}
        </div>
    );
}

interface DiceRollProps {
    d1: number | null;
    d2: number | null;
    d3: number | null;
    rolling?: boolean;
}

export function DiceRoll({ d1, d2, d3, rolling = false }: DiceRollProps) {
    return (
        <div className="flex items-center justify-center gap-2">
            <Dice3D value={d1} rolling={rolling} delay={0} size={50} />
            <Dice3D value={d2} rolling={rolling} delay={100} size={50} />
            <Dice3D value={d3} rolling={rolling} delay={200} size={50} />
        </div>
    );
}
