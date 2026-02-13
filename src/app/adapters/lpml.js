(function(global) {
	global.App = global.App || {};
	global.App.Adapters = global.App.Adapters || {};

	class LPMLRegexParser {
		static PATTERN_ATTRIBUTE = / ([^"'/<> -]+)=(?:"([^"]*)"|'([^']*)')/g;
		static ATTR_PART_NO_CAPTURE = " [^\"'/<> -]+=(?:\"[^\"]*\"|'[^']*')";
		static PATTERN_TAG_START = '<([^/>\\s\\n]+)((?:' + LPMLRegexParser.ATTR_PART_NO_CAPTURE + ')*)\\s*>';
		static PATTERN_TAG_END = '</([^/>\\s\\n]+)\\s*>';
		static PATTERN_TAG_EMPTY = '<([^/>\\s\\n]+)((?:' + LPMLRegexParser.ATTR_PART_NO_CAPTURE + ')*)\\s*/>';
		static PATTERN_TAG = new RegExp(`(${LPMLRegexParser.PATTERN_TAG_START})|(${LPMLRegexParser.PATTERN_TAG_END})|(${LPMLRegexParser.PATTERN_TAG_EMPTY})`, 'g');
		static PATTERN_PROTECT = /(`[\s\S]*?`|<!--[\s\S]*?-->|<![\s\S]*?>)/g;

		static parseAttributes(text) {
			const attributes = {};
			const regex = new RegExp(LPMLRegexParser.PATTERN_ATTRIBUTE);
			let match;
			while ((match = regex.exec(text)) !== null) {
				const key = match[1];
				const value = match[2] !== undefined ? match[2] : match[3];
				attributes[key] = value || "";
			}
			return attributes;
		}

		static restoreString(text, protectedMap) {
			if (!text.includes("__PROTECTED_")) return text;
			let result = text;
			for (const [placeholder, original] of Object.entries(protectedMap)) {
				result = result.replace(placeholder, () => original);
			}
			return result;
		}

		static restoreTree(tree, protectedMap) {
			return tree.map(item => {
				if (typeof item === 'string') return LPMLRegexParser.restoreString(item, protectedMap);
				if (item.attributes) {
					for (const k in item.attributes) item.attributes[k] = LPMLRegexParser.restoreString(item.attributes[k], protectedMap);
				}
				if (Array.isArray(item.content)) {
					item.content = LPMLRegexParser.restoreTree(item.content, protectedMap);
				}
				return item;
			});
		}

		static parseToTree(text, exclude = []) {
			const protectedContent = {};
			const protectedText = text.replace(LPMLRegexParser.PATTERN_PROTECT, (match) => {
				const placeholder = `__PROTECTED_${Math.random().toString(36).substring(2, 15)}__`;
				protectedContent[placeholder] = match;
				return placeholder;
			});

			const tree = [];
			let cursor = 0;
			let tagExclude = null;
			let stack = [{
				tag: 'root',
				content: tree
			}];
			const regexTag = new RegExp(LPMLRegexParser.PATTERN_TAG);
			let match;
			const regexStart = new RegExp('^' + LPMLRegexParser.PATTERN_TAG_START + '$');
			const regexEnd = new RegExp('^' + LPMLRegexParser.PATTERN_TAG_END + '$');
			const regexEmpty = new RegExp('^' + LPMLRegexParser.PATTERN_TAG_EMPTY + '$');

			while ((match = regexTag.exec(protectedText)) !== null) {
				const tagStr = match[0];
				const indTagStart = match.index;
				const indTagEnd = indTagStart + tagStr.length;
				const matchTagStart = tagStr.match(regexStart);
				const matchTagEnd = tagStr.match(regexEnd);
				const matchTagEmpty = tagStr.match(regexEmpty);

				if (tagExclude !== null) {
					if (matchTagEnd && matchTagEnd[1] === tagExclude) {
						tagExclude = null;
					} else {
						continue;
					}
				}

				const contentStr = protectedText.substring(cursor, indTagStart);
				if (contentStr.length > 0) stack[stack.length - 1].content.push(contentStr);
				cursor = indTagEnd;

				if (matchTagStart) {
					const name = matchTagStart[1];
					if (exclude.includes(name)) tagExclude = name;
					const el = {
						tag: name,
						attributes: LPMLRegexParser.parseAttributes(matchTagStart[2]),
						content: []
					};
					stack[stack.length - 1].content.push(el);
					stack.push(el);
				} else if (matchTagEmpty) {
					const name = matchTagEmpty[1];
					const el = {
						tag: name,
						attributes: LPMLRegexParser.parseAttributes(matchTagEmpty[2]),
						content: null
					};
					stack[stack.length - 1].content.push(el);
				} else if (matchTagEnd) {
					const name = matchTagEnd[1];
					let idx = stack.length - 1;
					while (idx > 0 && stack[idx].tag !== name) idx--;
					if (idx > 0) stack = stack.slice(0, idx);
					else stack[stack.length - 1].content.push(tagStr);
				}
			}
			const remaining = protectedText.substring(cursor);
			if (remaining.length > 0) stack[stack.length - 1].content.push(remaining);
			return LPMLRegexParser.restoreTree(tree, protectedContent);
		}
	}

	class LPMLAdapter extends global.REAL.ParserAdapter {
		constructor() {
			super();
			this.excludeTags = ['create_file', 'edit_file', 'ask', 'thinking', 'plan'];
		}
		parse(text) {
			const tree = LPMLRegexParser.parseToTree(text, this.excludeTags);
			let rawActions = tree.filter(item => typeof item === 'object');
			const edits = [];
			const others = [];
			const interrupts = [];
			for (const item of rawActions) {
				let contentText = this._extractContent(item.content);
				if (item.tag === 'edit_file' && contentText.includes('<<<<SEARCH')) {
					contentText = this._escapeRegexReplacement(contentText);
				}
				const action = {
					type: item.tag,
					params: {
						...item.attributes,
						content: contentText
					},
					raw: item
				};
				if (['ask', 'finish'].includes(action.type)) interrupts.push(action);
				else if (action.type === 'edit_file') edits.push(action);
				else others.push(action);
			}
			edits.sort((a, b) => {
				const pathA = a.params.path || "";
				const pathB = b.params.path || "";
				if (pathA !== pathB) return pathA.localeCompare(pathB);
				const isLineA = 'start' in a.params;
				const isLineB = 'start' in b.params;
				if (isLineA && isLineB) return parseInt(b.params.start || 0) - parseInt(a.params.start || 0);
				if (isLineA && !isLineB) return -1;
				if (!isLineA && isLineB) return 1;
				return 0;
			});
			return [...others, ...edits, ...interrupts];
		}
		_escapeRegexReplacement(content) {
			return content.replace(/(<<<<SEARCH\s*[\s\S]*?\s*====\s*)([\s\S]*?)(\s*>>>>)/g, (match, prefix, replacement, suffix) => {
				return prefix + replacement.replace(/\$/g, '$$$$') + suffix;
			});
		}
		_extractContent(content) {
			if (!content) return "";
			if (Array.isArray(content)) return content.map(c => typeof c === 'string' ? c : "").join("");
			return String(content);
		}
	}
	global.App.Adapters.LPMLAdapter = LPMLAdapter;
})(window);