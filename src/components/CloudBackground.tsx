"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const cloudShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    uniform sampler2D map;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;
    varying vec2 vUv;

    void main() {
      float depth = gl_FragCoord.z / gl_FragCoord.w;
      float fogFactor = smoothstep( fogNear, fogFar, depth );

      gl_FragColor = texture2D( map, vUv );
      gl_FragColor.w *= pow( gl_FragCoord.z, 20.0 );
      gl_FragColor = mix( gl_FragColor, vec4( fogColor , gl_FragColor.w ), fogFactor );
    }
  `
};

const CloudBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef<number>(0);
  const mouseX = useRef(0);
  const mouseY = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      1,
      3000
    );
    camera.position.z = 6000;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const fog = new THREE.Fog(0x4584b4, -100, 3000);
    scene.fog = fog;

    const tLoader = new THREE.TextureLoader();
    const startTime = Date.now();

    tLoader.load(
      "https://mrdoob.com/lab/javascript/webgl/clouds/cloud10.png",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;

        const material = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: texture },
            fogColor: { value: fog.color },
            fogNear: { value: fog.near },
            fogFar: { value: fog.far }
          },
          vertexShader: cloudShader.vertexShader,
          fragmentShader: cloudShader.fragmentShader,
          depthWrite: false,
          depthTest: false,
          transparent: true
        });

        const planeGeo = new THREE.PlaneGeometry(64, 64);
        const geometries = [];
        const dummy = new THREE.Object3D();

        for (let i = 0; i < 8000; i++) {
          dummy.position.x = Math.random() * 1000 - 500;
          dummy.position.y = -Math.random() * Math.random() * 200 - 15;
          dummy.position.z = i;
          dummy.rotation.z = Math.random() * Math.PI;
          dummy.scale.x = dummy.scale.y = Math.random() * Math.random() * 1.5 + 0.5;
          dummy.updateMatrix();

          const clonedPlaneGeo = planeGeo.clone();
          clonedPlaneGeo.applyMatrix4(dummy.matrix);
          geometries.push(clonedPlaneGeo);
        }

        const mergedGeo = BufferGeometryUtils.mergeGeometries(geometries);
        const mesh = new THREE.Mesh(mergedGeo, material);
        mesh.renderOrder = 2;

        const meshA = mesh.clone();
        meshA.position.z = -8000;
        meshA.renderOrder = 1;

        scene.add(mesh);
        scene.add(meshA);

        const animate = () => {
          frameRef.current = requestAnimationFrame(animate);

          const position = ((Date.now() - startTime) * 0.03) % 8000;

          camera.position.x += (mouseX.current - camera.position.x) * 0.01;
          camera.position.y += (-mouseY.current - camera.position.y) * 0.01;
          camera.position.z = -position + 8000;

          renderer.render(scene, camera);
        };

        animate();
      }
    );

    const onMouseMove = (event: MouseEvent) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX.current = (event.clientX - windowHalfX) * 0.25;
      mouseY.current = (event.clientY - windowHalfY) * 0.15;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameRef.current);
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      // Cleanup Three.js resources
      scene.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 w-screen h-screen -z-10 bg-[#326696]"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default CloudBackground;
