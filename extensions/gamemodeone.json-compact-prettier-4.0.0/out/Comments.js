"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Comments {
    static hasComments(data) {
        const symbols = Object.getOwnPropertySymbols(data);
        return symbols.length > 0;
    }
    static stringify(token) {
        // If the comment is a line comment, return it as is
        if (token.type === "LineComment")
            return `// ${token.value.trim()}`;
        // If the comment is a block comment, return it with /* and */
        let value = token.value.trim();
        // Remove indentation from the comment
        return `/* ${value} */`;
    }
    static getType(data, type) {
        const symbol = Symbol.for(type);
        const comments = data[symbol];
        if (!comments)
            return "";
        return comments.map((token) => this.stringify(token)).join("\n") + "\n";
    }
    static getMap(data, key) {
        const keylessComments = {
            beforeAll: this.getType(data, "before-all"),
            afterAll: this.getType(data, "after-all"),
            before: this.getType(data, "before"),
        };
        if (key === undefined)
            return keylessComments; // Handle both object keys (string) and array indices (number)
        const keyComments = {
            beforeProp: this.getType(data, `before:${key}`),
            afterProp: this.getType(data, `after-prop:${key}`),
            afterColon: this.getType(data, `after-colon:${key}`),
            afterValue: this.getType(data, `after-value:${key}`),
            after: this.getType(data, `after:${key}`),
        };
        return { ...keylessComments, ...keyComments };
    }
}
exports.default = Comments;
//# sourceMappingURL=Comments.js.map