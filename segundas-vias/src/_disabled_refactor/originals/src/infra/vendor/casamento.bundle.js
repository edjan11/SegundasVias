// Vendor loader for the original casamento bundle.
// This loader injects the existing built script at runtime so behavior remains identical
// while we incrementally refactor code into modules.

(function loadOriginalBundle() {
	try {
		// The original bundle lives at ui/js/casamento.bundle.js in the workspace.
		// We inject it as a script tag so the exact runtime behavior is preserved.
		const scriptPath = './ui/js/casamento.bundle.js';
		if (typeof document === 'undefined') return;
		const existing = document.querySelector(`script[data-original-bundle][src="${scriptPath}"]`);
		if (existing) return;
		const s = document.createElement('script');
		s.setAttribute('data-original-bundle', '1');
		s.src = scriptPath;
		s.defer = false;
		s.async = false;
		document.head.appendChild(s);
	} catch (e) {
		// no-op
	}
})();
