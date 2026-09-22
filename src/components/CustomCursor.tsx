import React, { useEffect, useRef, useState } from 'react';

const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;
    const lerpFactor = 0.15;

    const handlePointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) setIsVisible(true);

      if (dotRef.current) {
        dotRef.current.style.left = `${mouseX}px`;
        dotRef.current.style.top = `${mouseY}px`;
      }

      if (glowRef.current) {
        glowRef.current.style.left = `${mouseX}px`;
        glowRef.current.style.top = `${mouseY}px`;
      }
    };

    const handleMouseDown = () => setIsActive(true);
    const handleMouseUp = () => setIsActive(false);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"], input, textarea, .glass-card, .neon-btn-cyan, .neon-btn-outline, .cursor-pointer')) {
        setIsHovering(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"], input, textarea, .glass-card, .neon-btn-cyan, .neon-btn-outline, .cursor-pointer')) {
        setIsHovering(false);
      }
    };

    const handlePointerLeave = () => setIsVisible(false);
    const handlePointerEnter = () => setIsVisible(true);

    const animate = () => {
      ringX += (mouseX - ringX) * lerpFactor;
      ringY += (mouseY - ringY) * lerpFactor;

      if (ringRef.current) {
        ringRef.current.style.left = `${ringX}px`;
        ringRef.current.style.top = `${ringY}px`;
      }

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("pointerenter", handlePointerEnter);

    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("pointerenter", handlePointerEnter);
    };
  }, [isVisible]);

  return (
    <>
      <style>{`
        @media (hover: hover) and (pointer: fine) {
          * {
            cursor: none !important;
          }
        }
        .cursor-container {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
        }
        @media (hover: hover) and (pointer: fine) {
          .cursor-container {
            display: block;
          }
        }
        #cursor-dot {
          position: fixed;
          width: 6px;
          height: 6px;
          background: #00f2fe;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.3s ease, height 0.3s ease, background 0.3s ease, opacity 0.3s ease;
          z-index: 10001;
        }
        #cursor-ring {
          position: fixed;
          width: 34px;
          height: 34px;
          border: 1.5px solid rgba(0, 242, 254, 0.4);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: 
            width 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
            height 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
            border-color 0.4s ease,
            background 0.4s ease,
            opacity 0.3s ease;
          z-index: 10000;
        }
        #cursor-glow {
          position: fixed;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, transparent 70%);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 0;
          transition: opacity 0.5s ease;
        }
        .cursor-hover #cursor-dot {
          width: 4px;
          height: 4px;
          background: #ffffff;
        }
        .cursor-hover #cursor-ring {
          width: 50px;
          height: 50px;
          border-color: rgba(0, 242, 254, 0.8);
          background: rgba(0, 242, 254, 0.05);
        }
        .cursor-active #cursor-ring {
          width: 25px;
          height: 25px;
          background: rgba(0, 242, 254, 0.2);
          border-color: #00f2fe;
        }
      `}</style>
      <div 
        className={`cursor-container ${isHovering ? 'cursor-hover' : ''} ${isActive ? 'cursor-active' : ''}`} 
        aria-hidden="true"
      >
        <div id="cursor-dot" ref={dotRef} style={{ opacity: isVisible ? 1 : 0 }}></div>
        <div id="cursor-ring" ref={ringRef} style={{ opacity: isVisible ? 1 : 0 }}></div>
        <div id="cursor-glow" ref={glowRef} style={{ opacity: isVisible ? 1 : 0 }}></div>
      </div>
    </>
  );
};

export default CustomCursor;
