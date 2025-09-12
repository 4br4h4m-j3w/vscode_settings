"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Config {
    static get SkipFolders() {
        return ["vendor", ".vscode", ".git"];
    }
    static get RunMaxParallelTest() {
        return 20;
    }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map