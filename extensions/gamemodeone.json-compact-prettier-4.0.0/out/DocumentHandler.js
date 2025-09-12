"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const comment_json_1 = require("comment-json");
const vscode_1 = require("vscode");
const Comments_1 = require("./Comments");
class DocumentHandler {
    constructor(document, config) {
        this.document = document;
        this.config = config;
        this.getTextEdit = () => vscode_1.TextEdit.replace(this.getRange(), this.getFormattedText());
        this.getRange = () => new vscode_1.Range(0, 0, this.document.lineCount, 0);
        this.text = document.getText();
        this.indent = " ".repeat(this.config.indentLength);
        // Build the regex to match string literals and symbols
        const literalRegex = `"(?:[^\\"]|\\.)*"`;
        const afterRegex = `[:,{\\[]`;
        const beforeRegex = `[\\]\\}]`;
        this.LINE_WITH_SPACE_REGEX = new RegExp(`(${literalRegex})|(${afterRegex})|(${beforeRegex})`, "g");
        // Build the regex to match spaces between brackets
        const brackets = `[{\\[\\]}]`;
        this.BRACKET_SPACE_REGEX = new RegExp(`(?<=${brackets}) +(?=${brackets})`, "g");
    }
    getFormattedText() {
        // If there is a flag to ignore formatting, return the original text
        if (this.text.startsWith("// @prettier-ignore"))
            return this.text;
        // Try parse the JSON text
        let data;
        try {
            data = (0, comment_json_1.parse)(this.text, null, false);
            if (!data)
                return this.text;
        }
        catch (error) {
            vscode_1.window.showErrorMessage(error.message);
            return this.text;
        }
        // Format the data
        let formattedText = this.formatData(data) || this.text;
        const lines = [];
        // Add all comments before the data
        lines.push(Comments_1.default.getType(data, "before-all").trimEnd());
        // If the data is an object or array, format it as multi-line
        lines.push(formattedText);
        // Add all comments after the data
        lines.push(Comments_1.default.getType(data, "after-all").trimEnd());
        // Return the formatted text
        return lines.filter((l) => l).join("\n");
    }
    formatData(data, depth = 0, reservation = 0) {
        // Stringify the data
        let line = (0, comment_json_1.stringify)(data);
        // If the data is not an object, return the stringified version
        if (data == null || typeof data !== "object")
            return line;
        // If data has no comments
        const hasComments = Comments_1.default.hasComments(data);
        if (!hasComments) {
            // Try to format as a single line
            line = this.formatSingleLine(line, depth, reservation);
            if (line)
                return line;
        }
        // Return the lines
        return this.formatMultiLine(data, depth);
    }
    formatSingleLine(line, depth, reservation) {
        // Calculate the available length for the line
        const currentLength = this.indent.repeat(depth).length + reservation;
        const availableLength = this.config.maxLineLength - currentLength;
        // If bracket spacing is disabled, return the line as is
        if (!this.config.bracketSpacing) {
            line = line.replace(this.BRACKET_SPACE_REGEX, "");
            return line.length > availableLength ? null : line;
        }
        // Add spaces after symbols outside of string literals
        line = line.replace(this.LINE_WITH_SPACE_REGEX, (_, literal, after, before) => {
            if (literal)
                return literal; // Preserve string literals
            if (after)
                return after + " "; // Add space after symbols like [ or {
            if (before)
                return " " + before; // Add space before symbols like } or ]
        });
        // Remove spaces between subsequent brackets
        line = line.replace(this.BRACKET_SPACE_REGEX, "");
        return line.length > availableLength ? null : line;
    }
    formatMultiLine(data, depth) {
        // Get items at the next depth
        let text = "";
        // If there are comments before the object content, return them
        const beforeComments = Comments_1.default.getType(data, "before").trimEnd();
        if (beforeComments.length > 0)
            text = beforeComments;
        // If the data is an array, format it as array items
        else if (Array.isArray(data))
            text = this.formatArrayItems(data, depth + 1);
        // If the data is an object, format it as object items
        else
            text = this.formatObjectItems(data, depth + 1);
        // If there are no items, return empty brackets
        const bracketPair = Array.isArray(data) ? "[]" : "{}";
        if (text.length === 0)
            return bracketPair;
        // Apply indentation to the text, except for block comments
        text = this.indentText(text);
        // Format the items in brackets
        const [openBracket, closeBracket] = bracketPair;
        return [openBracket, text, closeBracket].join("\n");
    }
    indentText(text) {
        const lines = text.split("\n");
        let inMultilineComment = false;
        lines[0] = this.indent + lines[0];
        for (let i = 1; i < lines.length; i++) {
            let prevLine = lines[i - 1].trim();
            let inString = false;
            for (let j = 1; j < prevLine.length; j++) {
                const segment = prevLine.slice(j - 1, j + 1);
                if (inMultilineComment) {
                    if (segment === "*/")
                        inMultilineComment = false; // End of multiline comment
                    continue; // Skip the rest of the line
                }
                if (segment[0] === '"')
                    inString = !inString; // Toggle string state
                if (!inString && segment === "//")
                    break; // Start of line comment
                if (!inString && segment === "/*")
                    inMultilineComment = true; // Start of multiline comment
            }
            if (inMultilineComment)
                continue;
            lines[i] = this.indent + lines[i];
        }
        return lines.join("\n");
    }
    formatArrayItems(data, depth) {
        let text = "";
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            // Get all types of comments
            const comments = Comments_1.default.getMap(data, index);
            // Add comments before the value
            const beforeComments = comments.before + comments.beforeProp;
            if (beforeComments)
                text += beforeComments;
            // Calculate reservation for line length
            const isLast = index === data.length - 1;
            let reservation = isLast ? 0 : 1;
            // Calculate resevartion for comments on the same line
            const aftercomments = comments.afterValue + comments.afterColon + comments.after;
            if (aftercomments)
                reservation += aftercomments.split("\n")[0].length + 1;
            // Add the formatted value
            text += this.formatData(item, depth, reservation);
            // If not the last item, add a comma
            if (!isLast)
                text += ",";
            // Add comments after the colon
            if (aftercomments)
                text += " " + aftercomments;
            // If not the last item, add a newline
            if (!isLast && !text.endsWith("\n"))
                text += "\n";
        }
        return text.trim();
    }
    formatObjectItems(data, depth) {
        let text = "";
        const keys = Object.keys(data);
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            // Get all types of comments
            const comments = Comments_1.default.getMap(data, key);
            // Add before comments
            const beforeComments = comments.before + comments.beforeProp + comments.afterProp + comments.afterColon;
            if (beforeComments)
                text += beforeComments;
            // Add the property key
            text += `${JSON.stringify(key)}: `;
            // Reserve the space for the current characters on line
            let reservation = text.split("\n").pop().length;
            // Calculate reservation for comments on the same line
            const afterComments = comments.afterValue + comments.after;
            if (afterComments)
                reservation += afterComments.split("\n")[0].length + 1;
            // Reserve space for comma
            const isLast = index === keys.length - 1;
            if (!isLast)
                reservation += 1; // for comma
            // If the key is always open, reserve infinite space to force line break
            if (this.config.alwaysOpenKeys.includes(key))
                reservation = Infinity;
            // Add the formatted value
            text += this.formatData(data[key], depth, reservation);
            // If not the last key, add a comma
            if (!isLast)
                text += ",";
            // Add comments after the key
            if (afterComments)
                text += " " + afterComments;
            // If not the last key, add a newline
            if (!isLast && !text.endsWith("\n"))
                text += "\n";
        }
        return text.trim();
    }
}
exports.default = DocumentHandler;
//# sourceMappingURL=DocumentHandler.js.map