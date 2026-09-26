const SmoothRender = (function () {
    'use strict';

    const KEY_ATTR = 'data-key';
    const TEXT_ATTR = 'data-text';

    function nodeKey(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return null;
        return node.hasAttribute(KEY_ATTR) ? node.getAttribute(KEY_ATTR) : null;
    }

    function isTextHost(node) {
        return node.nodeType === Node.ELEMENT_NODE && node.hasAttribute(TEXT_ATTR);
    }

    function cloneFresh(node) {
        return isTextHost(node) ? node.cloneNode(false) : node.cloneNode(true);
    }

    function replaceNode(fromNode, freshNode) {
        const parent = fromNode.parentNode;
        if (parent) parent.replaceChild(freshNode, fromNode);
        return freshNode;
    }

    function syncAttributes(fromEl, toEl) {
        const wanted = toEl.attributes;
        for (let i = 0; i < wanted.length; i++) {
            const attr = wanted[i];
            if (fromEl.getAttribute(attr.name) !== attr.value) {
                fromEl.setAttribute(attr.name, attr.value);
            }
        }
        const current = fromEl.attributes;
        for (let i = current.length - 1; i >= 0; i--) {
            const attr = current[i];
            if (!toEl.hasAttribute(attr.name)) {
                fromEl.removeAttribute(attr.name);
            }
        }
    }

    function findReusable(candidates, taken, newNode) {
        for (let i = 0; i < candidates.length; i++) {
            if (taken[i]) continue;
            const candidate = candidates[i];
            if (nodeKey(candidate) !== null) continue;
            if (candidate.nodeType !== newNode.nodeType) continue;
            if (candidate.nodeName !== newNode.nodeName) continue;
            return i;
        }
        return -1;
    }

    function syncChildren(fromNode, toNode) {
        const existing = Array.prototype.slice.call(fromNode.childNodes);
        const wanted = Array.prototype.slice.call(toNode.childNodes);
        const taken = new Array(existing.length);
        for (let i = 0; i < taken.length; i++) taken[i] = false;

        const byKey = new Map();
        existing.forEach((child, i) => {
            const key = nodeKey(child);
            if (key !== null && !byKey.has(key)) byKey.set(key, i);
        });

        const resolved = new Array(wanted.length);

        for (let i = 0; i < wanted.length; i++) {
            const newChild = wanted[i];
            const key = nodeKey(newChild);
            let index = -1;

            if (key !== null) {
                if (byKey.has(key)) {
                    index = byKey.get(key);
                    byKey.delete(key);
                }
            } else {
                index = findReusable(existing, taken, newChild);
            }

            if (index >= 0) {
                taken[index] = true;
                resolved[i] = morphNode(existing[index], newChild);
            } else {
                resolved[i] = cloneFresh(newChild);
            }
        }

        for (let i = 0; i < existing.length; i++) {
            if (!taken[i]) fromNode.removeChild(existing[i]);
        }

        let reference = fromNode.firstChild;
        for (let i = 0; i < resolved.length; i++) {
            const node = resolved[i];
            if (node === reference) {
                reference = reference.nextSibling;
            } else {
                fromNode.insertBefore(node, reference);
            }
        }
    }

    function morphNode(fromNode, toNode) {
        if (fromNode.nodeType !== toNode.nodeType) {
            return replaceNode(fromNode, cloneFresh(toNode));
        }

        if (fromNode.nodeType === Node.TEXT_NODE) {
            if (fromNode.data !== toNode.data) fromNode.data = toNode.data;
            return fromNode;
        }

        if (fromNode.nodeType !== Node.ELEMENT_NODE) {
            return fromNode;
        }

        if (fromNode.nodeName !== toNode.nodeName || isTextHost(fromNode) !== isTextHost(toNode)) {
            return replaceNode(fromNode, cloneFresh(toNode));
        }

        syncAttributes(fromNode, toNode);

        if (!isTextHost(fromNode)) {
            syncChildren(fromNode, toNode);
        }

        return fromNode;
    }

    function splitKeepNewlines(text) {
        const parts = [];
        let start = 0;
        for (let i = 0; i < text.length; i++) {
            if (text.charCodeAt(i) === 10) {
                parts.push(text.substring(start, i + 1));
                start = i + 1;
            }
        }
        if (start < text.length) parts.push(text.substring(start));
        return parts;
    }

    function applyText(container, text) {
        const value = text === null || text === undefined ? '' : String(text);
        if (container.__smoothText === value) return false;
        if (container.__smoothText === undefined) container.textContent = '';

        const parts = splitKeepNewlines(value);
        const nodes = container.childNodes;
        const oldCount = nodes.length;
        const newCount = parts.length;
        const shared = Math.min(oldCount, newCount);

        let prefix = 0;
        while (prefix < shared && nodes[prefix].nodeType === Node.TEXT_NODE && nodes[prefix].data === parts[prefix]) {
            prefix++;
        }

        let suffix = 0;
        while (
            suffix < shared - prefix &&
            nodes[oldCount - 1 - suffix].nodeType === Node.TEXT_NODE &&
            nodes[oldCount - 1 - suffix].data === parts[newCount - 1 - suffix]
        ) {
            suffix++;
        }

        if (prefix < oldCount - suffix || prefix < newCount - suffix) {
            // Surviving nodes are never touched, so any selection living in
            // them stays exactly where the user put it.
            const anchor = suffix > 0 ? nodes[oldCount - suffix] : null;

            for (let i = oldCount - suffix - 1; i >= prefix; i--) {
                container.removeChild(nodes[i]);
            }

            for (let i = prefix; i < newCount - suffix; i++) {
                container.insertBefore(document.createTextNode(parts[i]), anchor);
            }
        }

        container.__smoothText = value;
        return true;
    }

    function renderHtml(container, html) {
        if (container.__smoothHtml === html) return false;

        const template = document.createElement('template');
        template.innerHTML = html;
        syncChildren(container, template.content);

        container.__smoothHtml = html;
        return true;
    }

    // Forgets what was last rendered into a container, so the next render()
    // goes through the DOM even when the markup is unchanged. Used to undo
    // hand-patched state (button feedback, focus, "loading" placeholders).
    function invalidate(container) {
        delete container.__smoothHtml;
        delete container.__smoothText;
    }

    return {
        render: renderHtml,
        text: applyText,
        textHost: isTextHost,
        invalidate: invalidate
    };
})();
