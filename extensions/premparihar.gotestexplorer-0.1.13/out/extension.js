'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const goTestExplorer_1 = require("./goTestExplorer");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    new goTestExplorer_1.GoTestExplorer(context);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map