<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * Version animee du degrade mesh de la marque (`surface-mesh` dans
	 * app.css) : les memes trois halos corail/rose/orange, mais qui derivent
	 * lentement. Reserve a la hero du Tour, seule page dont le sujet (le
	 * mouvement, un parcours a velo) justifie du mouvement en fond (R-19 antislop).
	 *
	 * Ne se monte jamais si `prefers-reduced-motion` est actif ou si WebGL est
	 * indisponible : le parent pose deja `surface-mesh` en fond CSS statique,
	 * ce canvas vient seulement le recouvrir quand l'animation est possible.
	 */
	let canvasEl: HTMLCanvasElement | undefined = $state();
	let mounted = $state(false);

	const VERTEX_SRC = `
		attribute vec2 aPosition;
		void main() {
			gl_Position = vec4(aPosition, 0.0, 1.0);
		}
	`;

	// Trois halos radiaux qui derivent en cercles lents, melanges dans le meme
	// ordre que --gradient-mesh (rose -> corail -> orange), sur un fond blanc.
	const FRAGMENT_SRC = `
		precision mediump float;
		uniform float uTime;
		uniform vec2 uResolution;

		void main() {
			vec2 uv = gl_FragCoord.xy / uResolution;
			uv.x *= uResolution.x / uResolution.y;
			float aspect = uResolution.x / uResolution.y;
			float t = uTime * 0.04;

			vec3 white = vec3(1.0, 1.0, 1.0);
			vec3 pink = vec3(1.0, 0.533, 0.718);
			vec3 coral = vec3(1.0, 0.341, 0.341);
			vec3 orange = vec3(1.0, 0.459, 0.122);

			vec2 p1 = vec2(0.30 + sin(t) * 0.10, 0.32 + cos(t * 1.3) * 0.10) * vec2(aspect, 1.0);
			vec2 p2 = vec2(0.74 + cos(t * 0.7) * 0.09, 0.56 + sin(t * 1.1) * 0.09) * vec2(aspect, 1.0);
			vec2 p3 = vec2(0.90 + sin(t * 0.55) * 0.07, 0.92 + cos(t * 0.85) * 0.07) * vec2(aspect, 1.0);

			float halo1 = smoothstep(0.62, 0.0, distance(uv, p1));
			float halo2 = smoothstep(0.66, 0.0, distance(uv, p2));
			float halo3 = smoothstep(0.68, 0.0, distance(uv, p3));

			vec3 color = mix(white, pink, halo1);
			color = mix(color, coral, halo2 * 0.85);
			color = mix(color, orange, halo3 * 0.85);

			gl_FragColor = vec4(color, 1.0);
		}
	`;

	function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const canvas = canvasEl;
		if (!canvas) return;
		const gl = canvas.getContext('webgl');
		if (!gl) return;

		const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
		const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
		const program = gl.createProgram();
		if (!vertexShader || !fragmentShader || !program) return;

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
			gl.STATIC_DRAW
		);

		const aPosition = gl.getAttribLocation(program, 'aPosition');
		const uTime = gl.getUniformLocation(program, 'uTime');
		const uResolution = gl.getUniformLocation(program, 'uResolution');

		gl.useProgram(program);
		gl.enableVertexAttribArray(aPosition);
		gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

		// Plafonne le ratio de pixels : un shader plein ecran en 3x sur un
		// telephone recent chauffe pour un rendu qu'on ne distingue pas d'un 2x.
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

		function resize() {
			if (!canvas || !gl) return;
			const { clientWidth, clientHeight } = canvas;
			canvas.width = Math.round(clientWidth * pixelRatio);
			canvas.height = Math.round(clientHeight * pixelRatio);
			gl.viewport(0, 0, canvas.width, canvas.height);
		}

		resize();
		window.addEventListener('resize', resize);

		const start = performance.now();
		let frame = requestAnimationFrame(function draw(now: number) {
			gl.uniform1f(uTime, (now - start) / 1000);
			gl.uniform2f(uResolution, canvas.width, canvas.height);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			frame = requestAnimationFrame(draw);
		});

		mounted = true;

		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', resize);
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			gl.deleteBuffer(buffer);
		};
	});
</script>

<canvas
	bind:this={canvasEl}
	class="absolute inset-0 h-full w-full transition-opacity duration-700"
	class:opacity-0={!mounted}
	aria-hidden="true"
></canvas>
