"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode_1 = require("vscode");
const DocumentHandler_1 = require("./DocumentHandler");
function activate(context) {
    // Register formatter for JSON and JSONC
    vscode_1.languages.registerDocumentFormattingEditProvider("json", { provideDocumentFormattingEdits: formatWithFormatter });
    vscode_1.languages.registerDocumentFormattingEditProvider("jsonc", { provideDocumentFormattingEdits: formatWithFormatter });
    // Register command for manual formatting
    const disposable = vscode_1.commands.registerCommand("json-compact-prettier.prettify", formatWithCommand);
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function formatWithFormatter(document) {
    const config = getConfig();
    const handler = new DocumentHandler_1.default(document, config);
    return [handler.getTextEdit()];
}
function formatWithCommand() {
    const editor = vscode_1.window.activeTextEditor;
    if (!editor)
        return;
    const config = getConfig();
    const handler = new DocumentHandler_1.default(editor.document, config);
    const edit = handler.getTextEdit();
    editor.edit((builder) => builder.replace(edit.range, edit.newText));
}
function getConfig() {
    let config = {};
    // Update config with workspace settings
    const workspaceConfig = vscode_1.workspace.getConfiguration("json-compact-prettier");
    const workspaceKeys = Object.keys(workspaceConfig).filter(workspaceConfig.has);
    for (let k of workspaceKeys)
        config[k] = workspaceConfig.get(k);
    // Update config with deprecated settings from "JSON Compact Prettier"
    const altWorkspaceConfig = vscode_1.workspace.getConfiguration("JSON Compact Prettier");
    const altWorkspaceKeys = Object.keys(altWorkspaceConfig).filter(workspaceConfig.has);
    for (let k of altWorkspaceKeys)
        config[k] = altWorkspaceConfig.get(k);
    // Display a warning if deprecated settings are used
    if (altWorkspaceKeys.length > 0) {
        const message = `Please update your settings to use "json-compact-prettier" instead of "JSON Compact Prettier".`;
        vscode_1.window.showWarningMessage(message);
    }
    // If indentLength is 0, set maxLineLength to infinity, so there are no line breaks
    if (config.indentLength === 0)
        config.maxLineLength = Infinity;
    return config;
}
//# sourceMappingURL=Main.js.map